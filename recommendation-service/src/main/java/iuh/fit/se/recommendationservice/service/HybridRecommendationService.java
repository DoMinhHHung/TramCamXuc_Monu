package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.client.MlServiceClient;
import iuh.fit.se.recommendationservice.client.MusicServiceClient;
import iuh.fit.se.recommendationservice.client.SocialServiceClient;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HybridRecommendationService {

    private final MlServiceClient               mlServiceClient;
    private final MusicServiceClient            musicServiceClient;
    private final SocialServiceClient           socialServiceClient;
    private final RuleBasedRecommendationService ruleBasedService;
    private final CacheService                  cacheService;

    @Value("${recommendation.cold-start-threshold:5}")
    private int coldStartThreshold;

    @Value("${recommendation.default-limit:20}")
    private int defaultLimit;

    // ─────────────────────────────────────────────────────────────
    // FOR YOU
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse getForYou(String userId, int limit) {
        // 1. Cache hit?
        Optional<RecommendationResponse> cached = cacheService.get(cacheService.forYouKey(userId));
        if (cached.isPresent()) return cached.get();

        // 2. Cold start check
        boolean isColdStart = isColdStart(userId);
        RecommendationResponse response;

        if (isColdStart) {
            log.info("Cold start for user {}, using rule-based", userId);
            response = ruleBasedService.forYouFallback(userId, limit);
        } else {
            // 3. Thử ML
            List<String> recentSongIds = getRecentSongIds(userId, 10);
            Optional<MlRecommendationResponse> mlResult = mlServiceClient.getForYouRecommendations(
                    MlRecommendationRequest.builder()
                            .userId(userId)
                            .limit(limit)
                            .excludeSongIds(recentSongIds)
                            .build()
            );

            if (mlResult.isPresent() && !mlResult.get().getSongIds().isEmpty()) {
                // 4a. ML thành công → fetch song details
                response = buildResponseFromIds(
                        mlResult.get().getSongIds(),
                        "ML_" + mlResult.get().getStrategy(),
                        mlResult.get().getReason() != null
                                ? mlResult.get().getReason()
                                : "Dành riêng cho bạn"
                );
            } else {
                // 4b. ML fail / trống → fallback rule-based
                log.info("ML unavailable for user {}, falling back to rule-based", userId);
                response = ruleBasedService.forYouFallback(userId, limit);
            }
        }

        // 5. Cache kết quả
        cacheService.putForYou(userId, response);
        return response;
    }

    // ─────────────────────────────────────────────────────────────
    // SIMILAR SONGS
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse getSimilarSongs(String songId, int limit) {
        // 1. Cache hit?
        Optional<RecommendationResponse> cached = cacheService.get(cacheService.similarKey(songId));
        if (cached.isPresent()) return cached.get();

        // 2. Thử ML content-based
        Optional<MlRecommendationResponse> mlResult = mlServiceClient.getSimilarSongs(
                MlRecommendationRequest.builder()
                        .songId(songId)
                        .limit(limit)
                        .build()
        );

        RecommendationResponse response;
        if (mlResult.isPresent() && !mlResult.get().getSongIds().isEmpty()) {
            response = buildResponseFromIds(
                    mlResult.get().getSongIds(),
                    "ML_" + mlResult.get().getStrategy(),
                    mlResult.get().getReason()
            );
        } else {
            response = ruleBasedService.similarSongs(songId, limit);
        }

        cacheService.putSimilar(songId, response);
        return response;
    }

    // ─────────────────────────────────────────────────────────────
    // TRENDING  (pure rule-based, với cache)
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse getTrending(int limit) {
        Optional<RecommendationResponse> cached = cacheService.get(cacheService.trendingKey());
        if (cached.isPresent()) return cached.get();

        RecommendationResponse response = ruleBasedService.trending(limit);
        cacheService.putTrending(response);
        return response;
    }

    // ─────────────────────────────────────────────────────────────
    // NEW RELEASES  (rule-based, với cache per user)
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse getNewReleases(String userId, int limit) {
        Optional<RecommendationResponse> cached = cacheService.get(cacheService.newReleasesKey(userId));
        if (cached.isPresent()) return cached.get();

        RecommendationResponse response = ruleBasedService.newReleases(userId, limit);
        cacheService.putNewReleases(userId, response);
        return response;
    }

    // ─────────────────────────────────────────────────────────────
    // GENRE MIX  (rule-based, với cache per user)
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse getGenreMix(String userId, int limit) {
        Optional<RecommendationResponse> cached = cacheService.get(cacheService.genreMixKey(userId));
        if (cached.isPresent()) return cached.get();

        RecommendationResponse response = ruleBasedService.genreMix(userId, limit);
        cacheService.putGenreMix(userId, response);
        return response;
    }

    // ── Private helpers ──────────────────────────────────────────

    /**
     * User có < coldStartThreshold lượt nghe → cold start.
     */
    private boolean isColdStart(String userId) {
        try {
            List<ListenHistoryDTO> history = socialServiceClient.getListenHistory(userId, coldStartThreshold, 90);
            return history.size() < coldStartThreshold;
        } catch (Exception e) {
            return true; // err on the safe side
        }
    }

    /**
     * Lấy N bài nghe gần nhất để truyền vào excludeSongIds.
     */
    private List<String> getRecentSongIds(String userId, int limit) {
        try {
            return socialServiceClient.getListenHistory(userId, limit, 7)
                    .stream()
                    .map(ListenHistoryDTO::getSongId)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /**
     * Nhận list songIds từ ML → gọi music-service để lấy full details.
     */
    private RecommendationResponse buildResponseFromIds(
            List<String> songIds, String strategy, String reason) {
        List<SongDTO> songs;
        try {
            songs = musicServiceClient.getSongsByIds(songIds);
            // Sắp xếp lại theo thứ tự ML đã rank
            songs.sort(Comparator.comparingInt(s -> songIds.indexOf(s.getId())));
        } catch (Exception e) {
            log.warn("Failed to fetch song details from music-service: {}", e.getMessage());
            songs = Collections.emptyList();
        }

        return RecommendationResponse.builder()
                .songs(songs)
                .strategy(strategy)
                .total(songs.size())
                .reason(reason)
                .build();
    }
}