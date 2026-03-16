package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.client.IdentityInternalClient;
import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Xử lý recommendation cho user mới (cold-start) hoặc user có ít listen history.
 *
 * ── Khi nào cold-start? ───────────────────────────────────────────────────────
 *   - ML service trả về < MIN_ML_RESULTS bài (sparse matrix)
 *   - user.pickFavorite = false (chưa chọn genres từ onboarding)
 *   - Đây là lần đầu tiên user request recommendation
 *
 * ── Chiến lược cold-start ─────────────────────────────────────────────────────
 *   1. Dùng favoriteGenreIds từ identity-service → lấy trending songs của genre đó
 *   2. Dùng favoriteArtistIds → lấy top songs của artist đó
 *   3. Fallback: trending global nếu không có cả hai
 *
 * ── Tại sao không dùng "popular overall"? ────────────────────────────────────
 *   "Popular overall" thường thiên về 1-2 genre chủ đạo → không phù hợp user
 *   có sở thích ngách. Dùng favorite genres/artists cá nhân hóa hơn nhiều,
 *   ngay cả khi đó là assumption từ onboarding screen.
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

    /** Nếu ML trả về ít hơn ngưỡng này → supplement bằng cold-start */
    public static final int MIN_ML_RESULTS = 10;

    /**
     * Lấy cold-start recommendations cho user.
     *
     * @param userId     user cần recommend
     * @param limit      số lượng cần trả về
     * @param disliked   bài đã dislike → loại trừ
     */
    public List<RecommendedSongDto> getColdStartRecommendations(
            UUID userId, int limit, Set<String> disliked) {

        UserFavoritesDto favorites = fetchUserFavorites();

        // User chưa chọn favorites hoặc Feign lỗi → fallback trending global
        if (favorites == null
                || (!Boolean.TRUE.equals(favorites.getPickFavorite())
                && CollectionUtils.isEmpty(favorites.getFavoriteGenreIds())
                && CollectionUtils.isEmpty(favorites.getFavoriteArtistIds()))) {
            log.debug("[ColdStart] No favorites for userId={}, using trending global", userId);
            return getFallbackTrending(limit, disliked);
        }

        List<RecommendedSongDto> result = new ArrayList<>();

        // Step 1: Songs từ favorite artists (nếu có)
        if (!CollectionUtils.isEmpty(favorites.getFavoriteArtistIds())) {
            List<RecommendedSongDto> artistSongs = getSongsFromFavoriteArtists(
                    favorites.getFavoriteArtistIds(), limit / 2, disliked);
            result.addAll(artistSongs);
        }

        // Step 2: Trending songs trong favorite genres
        if (!CollectionUtils.isEmpty(favorites.getFavoriteGenreIds())
                && result.size() < limit) {
            List<RecommendedSongDto> genreSongs = getTrendingSongsInFavoriteGenres(
                    favorites.getFavoriteGenreIds(), limit - result.size(), disliked, result);
            result.addAll(genreSongs);
        }

        // Step 3: Nếu vẫn thiếu → bổ sung trending global
        if (result.size() < limit) {
            Set<String> alreadyInResult = result.stream()
                    .map(RecommendedSongDto::getSongId)
                    .collect(Collectors.toSet());
            alreadyInResult.addAll(disliked);

            List<RecommendedSongDto> trending = getFallbackTrending(
                    limit - result.size(), alreadyInResult);
            result.addAll(trending);
        }

        log.debug("[ColdStart] Returned {} songs for userId={}", result.size(), userId);
        return result.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * Kiểm tra user có cần cold-start không.
     * Dùng trước khi quyết định gọi Python ML hay ColdStartHandler.
     *
     * @param mlResultCount số kết quả ML trả về
     */
    public boolean needsColdStart(int mlResultCount) {
        return mlResultCount < MIN_ML_RESULTS;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private UserFavoritesDto fetchUserFavorites() {
        try {
            ApiResponse<UserFavoritesDto> response = identityClient.getMyFavorites();
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("[ColdStart] Failed to fetch user favorites: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Lấy top songs của từng favorite artist.
     * Ưu tiên bài playCount cao → khả năng user thích artist này vì đã nghe qua.
     */
    private List<RecommendedSongDto> getSongsFromFavoriteArtists(
            Set<UUID> artistIds, int limit, Set<String> disliked) {

        List<RecommendedSongDto> result = new ArrayList<>();
        int songsPerArtist = Math.max(2, limit / artistIds.size());

        for (UUID artistId : artistIds) {
            try {
                List<SongDetailDto> songs = fetchSafeArtistSongs(artistId, songsPerArtist);
                if (CollectionUtils.isEmpty(songs)) continue;

                for (SongDetailDto song : songs) {
                    if (disliked.contains(song.getId())) continue;
                    SongDetailDto.ArtistInfo a = song.getPrimaryArtist();
                    result.add(RecommendedSongDto.builder()
                            .songId(song.getId())
                            .title(song.getTitle())
                            .slug(song.getSlug())
                            .thumbnailUrl(song.getThumbnailUrl())
                            .durationSeconds(song.getDurationSeconds())
                            .playCount(song.getPlayCount())
                            .artistId(a != null ? a.getArtistId() : null)
                            .artistStageName(a != null ? a.getStageName() : null)
                            .artistAvatarUrl(a != null ? a.getAvatarUrl() : null)
                            .reason(RecommendedSongDto.ReasonType.ARTIST_YOU_FOLLOW)
                            .reasonContext(a != null ? a.getStageName() : null)
                            .build());
                }
            } catch (Exception e) {
                log.warn("[ColdStart] Failed to get songs for artist {}: {}", artistId, e.getMessage());
            }
        }

        return result;
    }

    /**
     * Lấy trending songs trong các favorite genres.
     * Loại bỏ bài đã có trong existingResult để tránh duplicate.
     */
    private List<RecommendedSongDto> getTrendingSongsInFavoriteGenres(
            Set<UUID> genreIds, int limit, Set<String> disliked,
            List<RecommendedSongDto> existingResult) {

        Set<String> existingIds = existingResult.stream()
                .map(RecommendedSongDto::getSongId)
                .collect(Collectors.toSet());
        existingIds.addAll(disliked);

        List<RecommendedSongDto> result = new ArrayList<>();

        for (UUID genreId : genreIds) {
            if (result.size() >= limit) break;

            List<String> trendingIds = trendingScoreService
                    .getTrendingByGenre(genreId.toString(), 20);

            if (CollectionUtils.isEmpty(trendingIds)) continue;

            // Filter và hydrate
            List<String> filteredIds = trendingIds.stream()
                    .filter(id -> !existingIds.contains(id))
                    .limit(5)
                    .collect(Collectors.toList());

            List<SongDetailDto> songs = hydrateSongs(filteredIds);
            for (SongDetailDto song : songs) {
                if (result.size() >= limit) break;
                SongDetailDto.ArtistInfo a = song.getPrimaryArtist();
                result.add(RecommendedSongDto.builder()
                        .songId(song.getId())
                        .title(song.getTitle())
                        .slug(song.getSlug())
                        .thumbnailUrl(song.getThumbnailUrl())
                        .durationSeconds(song.getDurationSeconds())
                        .playCount(song.getPlayCount())
                        .artistId(a != null ? a.getArtistId() : null)
                        .artistStageName(a != null ? a.getStageName() : null)
                        .artistAvatarUrl(a != null ? a.getAvatarUrl() : null)
                        .reason(RecommendedSongDto.ReasonType.TRENDING_IN_GENRE)
                        .reasonContext(genreId.toString())
                        .build());
                existingIds.add(song.getId());
            }
        }

        return result;
    }

    /** Fallback: trending global khi không có gì khác */
    private List<RecommendedSongDto> getFallbackTrending(int limit, Set<String> exclude) {
        List<String> trendingIds = trendingScoreService.getGlobalTrending(limit * 2);
        List<String> filtered = trendingIds.stream()
                .filter(id -> !exclude.contains(id))
                .limit(limit)
                .collect(Collectors.toList());

        List<SongDetailDto> songs = hydrateSongs(filtered);
        return songs.stream().map(song -> {
            SongDetailDto.ArtistInfo a = song.getPrimaryArtist();
            return RecommendedSongDto.builder()
                    .songId(song.getId())
                    .title(song.getTitle())
                    .slug(song.getSlug())
                    .thumbnailUrl(song.getThumbnailUrl())
                    .durationSeconds(song.getDurationSeconds())
                    .playCount(song.getPlayCount())
                    .artistId(a != null ? a.getArtistId() : null)
                    .artistStageName(a != null ? a.getStageName() : null)
                    .artistAvatarUrl(a != null ? a.getAvatarUrl() : null)
                    .reason(RecommendedSongDto.ReasonType.POPULAR_GLOBALLY)
                    .build();
        }).collect(Collectors.toList());
    }

    private List<SongDetailDto> fetchSafeArtistSongs(UUID artistId, int limit) {
        try {
            ApiResponse<List<SongDetailDto>> resp =
                    musicClient.getSongsByArtist(artistId, limit);
            return resp != null ? resp.getResult() : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<SongDetailDto> hydrateSongs(List<String> songIds) {
        if (CollectionUtils.isEmpty(songIds)) return Collections.emptyList();
        try {
            List<UUID> uuids = songIds.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());
            ApiResponse<List<SongDetailDto>> resp = musicClient.getSongsByIds(uuids);
            return resp != null && resp.getResult() != null
                    ? resp.getResult() : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[ColdStart] Failed to hydrate songs: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}