package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import iuh.fit.se.recommendationservice.client.SocialInternalClient;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialGraphRecommendationService {

    private final SocialInternalClient socialClient;
    private final MusicInternalClient  musicClient;
    private final TrendingScoreService trendingService;

    /**
     * Crowd picks: trending trong genres user yêu thích.
     *
     * @param userId  current user
     * @param disliked bài user đã dislike (hard filter)
     * @param limit   số lượng
     */
    public List<RecommendedSongDto> getCrowdPicks(
            UUID userId, Set<String> disliked, int limit) {

        try {
            // Bước 1: Lấy liked songs → tìm top genres
            List<String> likedIds = safeGet(() ->
                    socialClient.getLikedSongIds(userId).getResult());

            if (CollectionUtils.isEmpty(likedIds)) return Collections.emptyList();

            // Lấy details của liked songs để extract genres
            List<UUID> uuids = likedIds.stream()
                    .limit(50)
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            List<SongDetailDto> likedSongs = safeGet(() ->
                    musicClient.getSongsByIds(uuids).getResult());

            if (CollectionUtils.isEmpty(likedSongs)) return Collections.emptyList();

            // Bước 2: Đếm genre frequency trong liked songs
            Map<String, Integer> genreFreq = new LinkedHashMap<>();
            Map<String, String>  genreNames = new HashMap<>();
            for (SongDetailDto song : likedSongs) {
                if (song.getGenres() == null) continue;
                song.getGenres().forEach(g -> {
                    genreFreq.merge(g.getId(), 1, Integer::sum);
                    genreNames.put(g.getId(), g.getName());
                });
            }

            // Top 3 genres
            List<String> topGenreIds = genreFreq.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit(3)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            if (topGenreIds.isEmpty()) return Collections.emptyList();

            // Bước 3: Trending trong top genres — songs được nhiều genres match → ưu tiên cao
            Map<String, Integer> songGenreMatch = new LinkedHashMap<>();
            Set<String> likedSet = new HashSet<>(likedIds);

            for (String genreId : topGenreIds) {
                List<String> genreTrending = trendingService.getTrendingByGenre(genreId, limit * 3);
                genreTrending.stream()
                        .filter(id -> !disliked.contains(id))
                        .filter(id -> !likedSet.contains(id)) // tránh gợi ý bài đã like rồi
                        .forEach(id -> songGenreMatch.merge(id, 1, Integer::sum));
            }

            List<String> candidateIds = songGenreMatch.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit((long) limit * 2)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            if (candidateIds.isEmpty()) return Collections.emptyList();

            // Bước 4: Hydrate + build response
            List<SongDetailDto> songs = safeGet(() ->
                    musicClient.getSongsByIds(candidateIds.stream()
                            .map(UUID::fromString)
                            .collect(Collectors.toList())).getResult());

            if (CollectionUtils.isEmpty(songs)) return Collections.emptyList();

            String topGenreName = genreNames.getOrDefault(topGenreIds.get(0), "nhạc của bạn");

            return songs.stream()
                    .limit(limit)
                    .map(s -> {
                        SongDetailDto.ArtistInfo a = s.getPrimaryArtist();
                        return RecommendedSongDto.builder()
                                .songId(s.getId())
                                .title(s.getTitle())
                                .slug(s.getSlug())
                                .thumbnailUrl(s.getThumbnailUrl())
                                .durationSeconds(s.getDurationSeconds())
                                .playCount(s.getPlayCount())
                                .artistId(a != null ? a.getArtistId() : null)
                                .artistStageName(a != null ? a.getStageName() : null)
                                .artistAvatarUrl(a != null ? a.getAvatarUrl() : null)
                                .genres(s.getGenres())
                                .reason(RecommendedSongDto.ReasonType.CROWD_PICK)
                                .reasonContext("Fan " + topGenreName + " đang nghe")
                                .build();
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.warn("[SocialGraph] getCrowdPicks failed for userId={}: {}", userId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private <T> T safeGet(java.util.function.Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (Exception e) {
            log.warn("[SocialGraph] safeGet: {}", e.getMessage());
            return null;
        }
    }
}
