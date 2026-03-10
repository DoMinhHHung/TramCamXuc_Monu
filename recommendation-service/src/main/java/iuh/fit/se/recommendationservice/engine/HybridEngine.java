package iuh.fit.se.recommendationservice.engine;

import iuh.fit.se.recommendationservice.client.MlServiceClient;
import iuh.fit.se.recommendationservice.client.SocialServiceClient;
import iuh.fit.se.recommendationservice.dto.*;
import iuh.fit.se.recommendationservice.dto.ml.MlRecommendRequest;
import iuh.fit.se.recommendationservice.dto.ml.MlRecommendResponse;
import iuh.fit.se.recommendationservice.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class HybridEngine {

    private final MlServiceClient    mlServiceClient;
    private final RuleBasedEngine    ruleBasedEngine;
    private final UserProfileService userProfileService;
    private final SocialServiceClient socialServiceClient;

    /**
     * Flow:
     * 1. Build user profile
     * 2. Gọi ML (timeout 5s)
     * 3. Nếu ML thành công → map song IDs thành SongScoreDto
     * 4. Nếu ML fail/timeout → fallback rule-based
     */
    public RecommendationResponse recommend(UUID userId, int limit,
                                            Map<UUID, SongDto> songCatalog) {
        long start = System.currentTimeMillis();
        UserProfileDto profile = userProfileService.buildProfile(userId);

        // Thử ML trước
        Optional<MlRecommendResponse> mlResult = tryMl(userId, profile, songCatalog, limit);

        if (mlResult.isPresent()) {
            List<SongScoreDto> songs = mapMlResult(mlResult.get(), songCatalog);

            if (!songs.isEmpty()) {
                return RecommendationResponse.builder()
                        .songs(songs)
                        .strategy("ml_" + mlResult.get().getStrategy())
                        .mlUsed(true)
                        .computeTimeMs(System.currentTimeMillis() - start)
                        .build();
            }
        }

        // Fallback: rule-based
        log.info("Using rule-based fallback for userId={}", userId);
        List<SongScoreDto> ruleResult = ruleBasedEngine.recommend(profile, limit);

        return RecommendationResponse.builder()
                .songs(ruleResult)
                .strategy("rule_based")
                .mlUsed(false)
                .computeTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    // ----------------------------------------------------------------
    // Private
    // ----------------------------------------------------------------

    private Optional<MlRecommendResponse> tryMl(
            UUID userId,
            UserProfileDto profile,
            Map<UUID, SongDto> songCatalog,
            int limit) {
        try {
            // Lấy listen history cho ML request
            List<ListenHistoryDto> history = fetchHistory(userId);

            List<String> followedArtists = profile.getFollowedArtistIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.toList());

            List<String> favoriteGenres = profile.getFavoriteGenreIds() != null
                    ? profile.getFavoriteGenreIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.toList())
                    : List.of();

            List<String> favoriteArtists = profile.getFavoriteArtistIds() != null
                    ? profile.getFavoriteArtistIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.toList())
                    : List.of();

            List<SongDto> candidates = new ArrayList<>(songCatalog.values());

            MlRecommendRequest request = MlRecommendRequest.from(
                    userId.toString(),
                    history,
                    followedArtists,
                    candidates,
                    limit,
                    favoriteGenres,
                    favoriteArtists
            );

            return mlServiceClient.getRecommendations(request);

        } catch (Exception e) {
            log.warn("Failed to prepare ML request: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Map song IDs từ ML response → SongScoreDto dùng songCatalog.
     * Song nào không có trong catalog thì bỏ qua.
     */
    private List<SongScoreDto> mapMlResult(
            MlRecommendResponse mlResponse,
            Map<UUID, SongDto> songCatalog) {

        return mlResponse.getSongs().stream()
                .map(scored -> {
                    try {
                        UUID songId = UUID.fromString(scored.getSongId());
                        SongDto song = songCatalog.get(songId);
                        if (song == null) return null;

                        return SongScoreDto.builder()
                                .song(song)
                                .score(scored.getScore())
                                .reason(scored.getReason())
                                .build();
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private List<ListenHistoryDto> fetchHistory(UUID userId) {
        try {
            ApiResponse<List<ListenHistoryDto>> response =
                    socialServiceClient.getListenHistory(userId, 200, 90);
            return response.getResult() != null ? response.getResult() : List.of();
        } catch (Exception e) {
            log.warn("Failed to fetch history for ML: {}", e.getMessage());
            return List.of();
        }
    }
}