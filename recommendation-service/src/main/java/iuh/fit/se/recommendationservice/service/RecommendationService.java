package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.dto.RecommendationResponse;

import java.util.UUID;

public interface RecommendationService {

    /** Personalized — dùng ML + fallback rule-based */
    RecommendationResponse forYou(UUID userId, int limit);

    /** Trending — public, không cần userId */
    RecommendationResponse trending(int limit);

    /** Similar songs — content-based theo songId */
    RecommendationResponse similar(UUID songId, int limit);

    /** New releases — public */
    RecommendationResponse newReleases(int limit);
}