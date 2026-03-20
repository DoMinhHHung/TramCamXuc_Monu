package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.client.IdentityInternalClient;
import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Xử lý cold-start recommendation cho:
 *   1. User mới (chưa có ML vector nào)
 *   2. User ít data (CF+CB trả về < MIN_ML_RESULTS bài)
 *
 * ── Nguồn dữ liệu ưu tiên (theo thứ tự) ──────────────────────────────────
 *
 *   [A] Onboarding favorites (LUÔN ưu tiên)
 *       → favoriteArtistIds: lấy top songs của từng artist
 *       → favoriteGenreIds:  lấy songs theo genre
 *
 *   [B] Trending theo genre (nếu ZSET có data)
 *       → Dùng khi platform đã có lượt nghe nhất định
 *
 *   [C] Music-service search theo genre (fallback khi ZSET rỗng)
 *       → Gọi GET /songs?genreId=... để lấy bài mới nhất theo genre
 *       → Đảm bảo cold-start không bao giờ trả về empty với user đã pick favorites
 *
 *   [D] Global trending (fallback cuối cùng)
 *       → Dùng khi user chưa pick favorites (bỏ qua onboarding)
 *
 * ── Tại sao không phụ thuộc hoàn toàn vào Redis ZSET? ────────────────────
 *   Platform mới: chưa có ai nghe → ZSET rỗng → phải gọi music-service DB
 *   Platform cũ:  ZSET có data → trending theo genre chính xác hơn DB query
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ColdStartHandler {

    private final IdentityInternalClient identityClient;
    private final MusicInternalClient    musicClient;
    private final TrendingScoreService   trendingScoreService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisConfig.RecommendationProperties props;

    /** Nếu ML trả về ít hơn ngưỡng này → bổ sung cold-start */
    public static final int MIN_ML_RESULTS = 10;

    /** Số bài tối đa lấy cho mỗi artist trong onboarding */
    private static final int SONGS_PER_ARTIST = 5;

    /** Số bài tối đa lấy cho mỗi genre trong onboarding */
    private static final int SONGS_PER_GENRE = 8;

    // ─────────────────────────────────────────────────────────────────────────

    public boolean needsColdStart(int mlResultCount) {
        return mlResultCount < MIN_ML_RESULTS;
    }

    /**
     * Lấy cold-start recommendations.
     *
     * @param userId   user cần recommend
     * @param limit    số bài cần trả về
     * @param disliked bài đã dislike → không bao giờ recommend lại
     */
    public List<RecommendedSongDto> getColdStartRecommendations(
            UUID userId, int limit, Set<String> disliked) {

        // Bước 1: Lấy favorites từ identity-service
        UserFavoritesDto favorites = fetchFavorites();

        boolean hasFavorites = favorites != null
                && Boolean.TRUE.equals(favorites.getPickFavorite())
                && (!CollectionUtils.isEmpty(favorites.getFavoriteArtistIds())
                || !CollectionUtils.isEmpty(favorites.getFavoriteGenreIds()));

        if (!hasFavorites) {
            // User bỏ qua onboarding (không bắt buộc nếu flow cho phép skip)
            // → fallback về global trending
            log.debug("[ColdStart] No favorites for userId={}, fallback to global trending", userId);
            return getGlobalTrendingFallback(limit, disliked, Collections.emptySet());
        }

        log.debug("[ColdStart] Building recommendations from onboarding favorites for userId={}", userId);

        List<RecommendedSongDto> result       = new ArrayList<>();
        Set<String>              alreadyAdded = new HashSet<>(disliked);

        // Bước 2: Songs từ favorite ARTISTS
        //   Ưu tiên cao nhất — user chủ động chọn artist → signal mạnh nhất
        if (!CollectionUtils.isEmpty(favorites.getFavoriteArtistIds())) {
            int artistSlots = Math.min(limit / 2, SONGS_PER_ARTIST
                    * favorites.getFavoriteArtistIds().size());

            List<RecommendedSongDto> artistSongs = getSongsFromFavoriteArtists(
                    favorites.getFavoriteArtistIds(), artistSlots, alreadyAdded);

            result.addAll(artistSongs);
            artistSongs.forEach(s -> alreadyAdded.add(s.getSongId()));

            log.debug("[ColdStart] {} songs from favorite artists", artistSongs.size());
        }

        // Bước 3: Songs từ favorite GENRES (nếu vẫn chưa đủ)
        if (!CollectionUtils.isEmpty(favorites.getFavoriteGenreIds())
                && result.size() < limit) {

            int genreSlots = limit - result.size();

            List<RecommendedSongDto> genreSongs = getSongsFromFavoriteGenres(
                    favorites.getFavoriteGenreIds(), genreSlots, alreadyAdded);

            result.addAll(genreSongs);
            genreSongs.forEach(s -> alreadyAdded.add(s.getSongId()));

            log.debug("[ColdStart] {} songs from favorite genres", genreSongs.size());
        }

        // Bước 4: Vẫn chưa đủ → bổ sung global trending
        if (result.size() < limit) {
            List<RecommendedSongDto> trending =
                    getGlobalTrendingFallback(limit - result.size(), disliked, alreadyAdded);
            result.addAll(trending);
            log.debug("[ColdStart] {} songs from global trending supplement", trending.size());
        }

        log.info("[ColdStart] userId={} → {} songs (hasFavorites={})",
                userId, result.size(), hasFavorites);

        return result.stream().limit(limit).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [A] Songs từ favorite artists
    // ─────────────────────────────────────────────────────────────────────────

    private List<RecommendedSongDto> getSongsFromFavoriteArtists(
            Set<UUID> artistIds, int limit, Set<String> exclude) {

        List<RecommendedSongDto> result = new ArrayList<>();
        // Phân bổ đều số bài cho mỗi artist
        int perArtist = Math.max(1, limit / artistIds.size());

        for (UUID artistId : artistIds) {
            if (result.size() >= limit) break;

            try {
                ApiResponse<List<SongDetailDto>> resp =
                        musicClient.getSongsByArtist(artistId, perArtist + 2);  // +2 để bù exclude

                if (resp == null || CollectionUtils.isEmpty(resp.getResult())) continue;

                for (SongDetailDto song : resp.getResult()) {
                    if (result.size() >= limit) break;
                    if (exclude.contains(song.getId())) continue;

                    result.add(toDto(song, RecommendedSongDto.ReasonType.ARTIST_YOU_FOLLOW,
                            artistStageName(song)));
                }

            } catch (Exception e) {
                log.warn("[ColdStart] Failed to get songs for artistId={}: {}", artistId, e.getMessage());
            }
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [B] + [C] Songs từ favorite genres — trending ZSET trước, DB fallback sau
    // ─────────────────────────────────────────────────────────────────────────

    private List<RecommendedSongDto> getSongsFromFavoriteGenres(
            Set<UUID> genreIds, int limit, Set<String> exclude) {

        List<RecommendedSongDto> result = new ArrayList<>();
        int perGenre = Math.max(1, limit / genreIds.size());

        for (UUID genreId : genreIds) {
            if (result.size() >= limit) break;

            // [B] Thử trending ZSET trước
            List<RecommendedSongDto> genreSongs =
                    getFromTrendingZSet(genreId, perGenre + 2, exclude);

            // [C] ZSET rỗng hoặc không đủ → fallback gọi music-service DB
            if (genreSongs.size() < Math.min(perGenre, 3)) {
                List<RecommendedSongDto> dbSongs =
                        getFromMusicServiceDb(genreId, perGenre + 2, exclude);

                // Merge: ưu tiên ZSET (trending), bổ sung từ DB
                Set<String> added = genreSongs.stream()
                        .map(RecommendedSongDto::getSongId)
                        .collect(Collectors.toSet());

                for (RecommendedSongDto s : dbSongs) {
                    if (!added.contains(s.getSongId())) genreSongs.add(s);
                }
            }

            // Lấy đủ perGenre bài, không trùng với exclude
            for (RecommendedSongDto s : genreSongs) {
                if (result.size() >= limit) break;
                if (!exclude.contains(s.getSongId())) result.add(s);
            }
        }

        return result;
    }

    /**
     * [B] Lấy từ Redis trending ZSET theo genre.
     * Nhanh — O(log N + M). Nhưng có thể rỗng với platform mới.
     */
    private List<RecommendedSongDto> getFromTrendingZSet(
            UUID genreId, int limit, Set<String> exclude) {

        List<String> trendingIds =
                trendingScoreService.getTrendingByGenre(genreId.toString(), limit * 2);

        if (CollectionUtils.isEmpty(trendingIds)) return Collections.emptyList();

        List<UUID> idsToFetch = trendingIds.stream()
                .filter(id -> !exclude.contains(id))
                .limit(limit)
                .map(UUID::fromString)
                .collect(Collectors.toList());

        if (idsToFetch.isEmpty()) return Collections.emptyList();

        try {
            ApiResponse<List<SongDetailDto>> resp = musicClient.getSongsByIds(idsToFetch);
            if (resp == null || CollectionUtils.isEmpty(resp.getResult()))
                return Collections.emptyList();

            return resp.getResult().stream()
                    .map(s -> toDto(s, RecommendedSongDto.ReasonType.TRENDING_IN_GENRE,
                            genreId.toString()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.warn("[ColdStart] ZSET hydration failed genreId={}: {}", genreId, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * [C] Gọi thẳng music-service search theo genre — không phụ thuộc ZSET.
     * Dùng khi platform mới hoặc genre chưa có đủ listen events để build ZSET.
     *
     * Trả về bài PUBLIC + COMPLETED sắp theo createdAt DESC (mới nhất trước).
     * Đủ để đảm bảo cold-start user luôn thấy bài thuộc genre mình thích.
     */
    private List<RecommendedSongDto> getFromMusicServiceDb(
            UUID genreId, int limit, Set<String> exclude) {
        try {
            ApiResponse<Page<SongDetailDto>> resp =
                    musicClient.searchSongsByGenre(genreId, 1, limit + 5);

            if (resp == null || resp.getResult() == null
                    || CollectionUtils.isEmpty(resp.getResult().getContent())) {
                return Collections.emptyList();
            }

            return resp.getResult().getContent().stream()
                    .filter(s -> !exclude.contains(s.getId()))
                    .limit(limit)
                    .map(s -> toDto(s, RecommendedSongDto.ReasonType.TRENDING_IN_GENRE,
                            genreId.toString()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.warn("[ColdStart] Music-service DB fallback failed genreId={}: {}",
                    genreId, e.getMessage());
            return Collections.emptyList();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [D] Global trending — fallback cuối
    // ─────────────────────────────────────────────────────────────────────────

    private List<RecommendedSongDto> getGlobalTrendingFallback(
            int limit, Set<String> disliked, Set<String> alreadyAdded) {

        Set<String> exclude = new HashSet<>(disliked);
        exclude.addAll(alreadyAdded);

        // Thử Redis ZSET global trước
        List<String> trendingIds = trendingScoreService.getGlobalTrending(limit * 2);

        if (!CollectionUtils.isEmpty(trendingIds)) {
            List<UUID> toFetch = trendingIds.stream()
                    .filter(id -> !exclude.contains(id))
                    .limit(limit)
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            if (!toFetch.isEmpty()) {
                try {
                    ApiResponse<List<SongDetailDto>> resp = musicClient.getSongsByIds(toFetch);
                    if (resp != null && !CollectionUtils.isEmpty(resp.getResult())) {
                        return resp.getResult().stream()
                                .map(s -> toDto(s, RecommendedSongDto.ReasonType.POPULAR_GLOBALLY, null))
                                .collect(Collectors.toList());
                    }
                } catch (Exception e) {
                    log.warn("[ColdStart] Global trending hydration failed: {}", e.getMessage());
                }
            }
        }

        // ZSET rỗng → gọi music-service /songs/trending
        try {
            ApiResponse<Page<SongDetailDto>> resp = musicClient.getTrendingSongs(1, limit + 5);
            if (resp != null && resp.getResult() != null
                    && !CollectionUtils.isEmpty(resp.getResult().getContent())) {

                return resp.getResult().getContent().stream()
                        .filter(s -> !exclude.contains(s.getId()))
                        .limit(limit)
                        .map(s -> toDto(s, RecommendedSongDto.ReasonType.POPULAR_GLOBALLY, null))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("[ColdStart] Music-service trending fallback failed: {}", e.getMessage());
        }

        return Collections.emptyList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private UserFavoritesDto fetchFavorites() {
        try {
            ApiResponse<UserFavoritesDto> resp = identityClient.getMyFavorites();
            return resp != null ? resp.getResult() : null;
        } catch (Exception e) {
            log.warn("[ColdStart] Failed to fetch favorites from identity-service: {}", e.getMessage());
            return null;
        }
    }

    private RecommendedSongDto toDto(SongDetailDto song,
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

    private String artistStageName(SongDetailDto song) {
        return song.getPrimaryArtist() != null ? song.getPrimaryArtist().getStageName() : null;
    }
}