package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import iuh.fit.se.recommendationservice.client.SocialInternalClient;
import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Ba luồng social recommendation:
 *
 * ── Luồng 1: Friends are listening ──────────────────────────────────────────
 *   - Lấy danh sách userId mà current user follow
 *   - Lấy songId họ đã like (từ social-service /internal/social/reactions/{userId}/liked)
 *   - Aggregate + sort by frequency (nhiều bạn cùng like → score cao hơn)
 *   - Loại bỏ bài user đã nghe
 *
 * ── Luồng 2: Songs from artists you follow ──────────────────────────────────
 *   - Lấy artistIds user đang follow
 *   - Lấy top songs của từng artist (music-service /artists/{id}/songs)
 *   - Sort by playCount → artist phổ biến lên trước
 *
 * ── Luồng 3: New releases from followed artists ──────────────────────────────
 *   - Mỗi artist có key "rec:new-releases:artist:{artistId}" (ZSET score = publishedAt)
 *   - Union các ZSETs → return albums/songs mới nhất trong 30 ngày
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SocialRecommendationService {

    private final SocialInternalClient socialClient;
    private final MusicInternalClient  musicClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisConfig.RecommendationProperties props;

    /**
     * Luồng 1: Songs bạn bè đang like/nghe.
     *
     * @param userId current user
     * @param limit  số lượng cần lấy
     * @param alreadyHeardIds bài user đã nghe → loại trừ
     * @return list bài hát kèm tên bạn đã like (reasonContext)
     */
    public List<RecommendedSongDto> getFriendsListening(
            UUID userId, int limit, Set<String> alreadyHeardIds) {

        // Step 1: Lấy danh sách bạn bè
        List<String> friendIds = safeGet(() ->
                socialClient.getFollowedUserIds(userId).getResult());

        if (CollectionUtils.isEmpty(friendIds)) {
            log.debug("[Social] User {} has no followed users", userId);
            return Collections.emptyList();
        }

        // Step 2: Lấy liked songs của từng bạn, đếm tần số
        // friendLikeCount: songId → số lượng bạn đã like
        // firstFriendId: songId → bạn đầu tiên like (để set reasonContext)
        Map<String, Integer> friendLikeCount = new LinkedHashMap<>();
        Map<String, String>  firstFriendId   = new HashMap<>();

        // Giới hạn 20 bạn để tránh quá nhiều Feign calls
        List<String> topFriends = friendIds.stream().limit(20).collect(Collectors.toList());

        for (String friendId : topFriends) {
            try {
                List<String> likedSongs = safeGet(() ->
                        socialClient.getLikedSongIds(UUID.fromString(friendId)).getResult());

                if (CollectionUtils.isEmpty(likedSongs)) continue;

                for (String songId : likedSongs) {
                    if (alreadyHeardIds.contains(songId)) continue;
                    friendLikeCount.merge(songId, 1, Integer::sum);
                    firstFriendId.putIfAbsent(songId, friendId);
                }
            } catch (Exception e) {
                log.warn("[Social] Failed to get liked songs for friend {}: {}", friendId, e.getMessage());
            }
        }

        if (friendLikeCount.isEmpty()) return Collections.emptyList();

        // Step 3: Sort by frequency, lấy top-limit songIds
        List<String> topSongIds = friendLikeCount.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(limit * 2L) // lấy nhiều hơn để sau hydrate còn đủ
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // Step 4: Hydrate sang full song details
        List<SongDetailDto> songs = hydrateSongs(topSongIds);

        return songs.stream()
                .limit(limit)
                .map(song -> toRecommendedDto(
                        song,
                        RecommendedSongDto.ReasonType.FRIEND_LIKED,
                        "Friend liked this" // ideally lookup friend's name, simplified here
                ))
                .collect(Collectors.toList());
    }

    /**
     * Luồng 2: Songs từ artists user đang follow.
     *
     * @param userId current user
     * @param limit  số lượng cần lấy
     * @return top songs của các followed artists, sort by playCount
     */
    public List<RecommendedSongDto> getSongsFromFollowedArtists(
            UUID userId, int limit, Set<String> alreadyHeardIds) {

        List<String> artistIds = safeGet(() ->
                socialClient.getFollowedArtistIds(userId).getResult());

        if (CollectionUtils.isEmpty(artistIds)) {
            return Collections.emptyList();
        }

        List<SongDetailDto> allSongs = new ArrayList<>();
        int songsPerArtist = Math.max(3, limit / artistIds.size() + 1);

        for (String artistId : artistIds) {
            try {
                List<SongDetailDto> artistSongs = safeGet(() ->
                        musicClient.getSongsByArtist(UUID.fromString(artistId), songsPerArtist).getResult());

                if (!CollectionUtils.isEmpty(artistSongs)) {
                    allSongs.addAll(artistSongs);
                }
            } catch (Exception e) {
                log.warn("[Social] Failed to get songs for artist {}: {}", artistId, e.getMessage());
            }
        }

        // Filter already heard + sort by playCount
        return allSongs.stream()
                .filter(s -> !alreadyHeardIds.contains(s.getId()))
                .sorted(Comparator.comparingLong(s ->
                        -(s.getPlayCount() != null ? s.getPlayCount() : 0L)))
                .limit(limit)
                .map(song -> {
                    // reasonContext = stage name của artist
                    String stageName = song.getPrimaryArtist() != null
                            ? song.getPrimaryArtist().getStageName() : "";
                    return toRecommendedDto(
                            song,
                            RecommendedSongDto.ReasonType.ARTIST_YOU_FOLLOW,
                            stageName
                    );
                })
                .collect(Collectors.toList());
    }

    /**
     * Luồng 3: New releases từ followed artists.
     *
     * Đọc từ Redis ZSET "rec:new-releases:artist:{artistId}" được build
     * bởi TrendingDecayScheduler khi nhận FeedContentEvent.
     *
     * @return albums/songs mới trong 30 ngày từ artists user follow
     */
    public List<RecommendedSongDto> getNewReleasesFromFollowedArtists(UUID userId, int limit) {
        List<String> artistIds = safeGet(() ->
                socialClient.getFollowedArtistIds(userId).getResult());

        if (CollectionUtils.isEmpty(artistIds)) {
            return Collections.emptyList();
        }

        // Collect albumIds từ tất cả followed artists
        List<String> albumIds = new ArrayList<>();
        for (String artistId : artistIds) {
            String key = "rec:new-releases:artist:" + artistId;
            Set<Object> albums = redisTemplate.opsForZSet().reverseRange(key, 0, 4);
            if (albums != null) {
                albums.stream().map(Object::toString).forEach(albumIds::add);
            }
        }

        if (albumIds.isEmpty()) {
            // Fallback: lấy global new releases nếu không có theo artist
            Set<Object> global = redisTemplate.opsForZSet()
                    .reverseRange(RedisConfig.KEY_ALL_NEW_RELEASES, 0, limit - 1L);
            if (global != null) {
                global.stream().map(Object::toString).forEach(albumIds::add);
            }
        }

        if (albumIds.isEmpty()) return Collections.emptyList();

        // NOTE: Ở đây albumId, không phải songId.
        // Để đơn giản, lấy songs mới nhất của artists theo paged endpoint
        // thay vì fetch album detail rồi expand songs.
        // (Python CB service sẽ handle album-level recommendation riêng)
        List<SongDetailDto> newSongs = new ArrayList<>();
        for (String artistId : artistIds.stream().limit(10).collect(Collectors.toList())) {
            try {
                var page = safeGet(() ->
                        musicClient.getSongsByArtistPaged(
                                UUID.fromString(artistId), 1, 3).getResult());
                if (page != null && page.getContent() != null) {
                    newSongs.addAll(page.getContent());
                }
            } catch (Exception e) {
                log.warn("[NewReleases] Failed for artist {}: {}", artistId, e.getMessage());
            }
        }

        return newSongs.stream()
                .limit(limit)
                .map(song -> {
                    String stageName = song.getPrimaryArtist() != null
                            ? song.getPrimaryArtist().getStageName() : "";
                    return toRecommendedDto(
                            song,
                            RecommendedSongDto.ReasonType.NEW_RELEASE,
                            stageName
                    );
                })
                .collect(Collectors.toList());
    }

    /**
     * Lấy songIds user đã nghe gần đây (để loại trừ khỏi recommendation).
     * Lookback window = exclusionWindowDays từ config.
     */
    public Set<String> getRecentlyHeardSongIds(UUID userId) {
        try {
            int days = props.getPage().getExclusionWindowDays();
            List<ListenHistoryItemDto> history = safeGet(() ->
                    socialClient.getListenHistory(userId, 200, days).getResult());

            if (CollectionUtils.isEmpty(history)) return Collections.emptySet();

            return history.stream()
                    .map(ListenHistoryItemDto::getSongId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

        } catch (Exception e) {
            log.warn("[Social] Failed to get listen history for exclusion: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    /**
     * Lấy disliked songIds để filter tuyệt đối.
     * Bài bị dislike không bao giờ xuất hiện lại.
     */
    public Set<String> getDislikedSongIds(UUID userId) {
        try {
            List<String> disliked = safeGet(() ->
                    socialClient.getDislikedSongIds(userId).getResult());
            return new HashSet<>(disliked != null ? disliked : Collections.emptyList());
        } catch (Exception e) {
            log.warn("[Social] Failed to get disliked songs: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Gọi music-service batch endpoint để convert songIds → full SongDetailDto.
     * Chunk theo 50 IDs để tránh URL quá dài.
     */
    private List<SongDetailDto> hydrateSongs(List<String> songIds) {
        if (CollectionUtils.isEmpty(songIds)) return Collections.emptyList();

        List<SongDetailDto> result = new ArrayList<>();
        List<List<String>> chunks = partition(songIds, 50);

        for (List<String> chunk : chunks) {
            try {
                List<UUID> uuids = chunk.stream()
                        .map(UUID::fromString)
                        .collect(Collectors.toList());
                List<SongDetailDto> batch = safeGet(() ->
                        musicClient.getSongsByIds(uuids).getResult());
                if (!CollectionUtils.isEmpty(batch)) result.addAll(batch);
            } catch (Exception e) {
                log.warn("[Social] Failed to hydrate song batch: {}", e.getMessage());
            }
        }
        return result;
    }

    private RecommendedSongDto toRecommendedDto(
            SongDetailDto song,
            RecommendedSongDto.ReasonType reason,
            String reasonContext) {

        SongDetailDto.ArtistInfo artist = song.getPrimaryArtist();
        return RecommendedSongDto.builder()
                .songId(song.getId())
                .title(song.getTitle())
                .slug(song.getSlug())
                .thumbnailUrl(song.getThumbnailUrl())
                .durationSeconds(song.getDurationSeconds())
                .playCount(song.getPlayCount())
                .artistId(artist != null ? artist.getArtistId() : null)
                .artistStageName(artist != null ? artist.getStageName() : null)
                .artistAvatarUrl(artist != null ? artist.getAvatarUrl() : null)
                .reason(reason)
                .reasonContext(reasonContext)
                .build();
    }

    /** Partition list thành sub-lists kích thước maxSize */
    private <T> List<List<T>> partition(List<T> list, int maxSize) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += maxSize) {
            partitions.add(list.subList(i, Math.min(i + maxSize, list.size())));
        }
        return partitions;
    }

    /** Safely call a supplier, return null on exception */
    private <T> T safeGet(java.util.function.Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (Exception e) {
            log.warn("[Social] safeGet failed: {}", e.getMessage());
            return null;
        }
    }
}