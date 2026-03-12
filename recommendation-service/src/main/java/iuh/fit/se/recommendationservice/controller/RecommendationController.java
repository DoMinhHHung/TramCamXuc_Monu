package iuh.fit.se.recommendationservice.controller;

import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.RecommendationResponse;
import iuh.fit.se.recommendationservice.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * GET /recommendations/for-you?limit=20
     * Personalized — cần JWT
     */
    @GetMapping("/for-you")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<RecommendationResponse> forYou(
            @RequestParam(defaultValue = "20") int limit,
            Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        return ApiResponse.success(recommendationService.forYou(userId, limit));
    }

    /**
     * GET /recommendations/trending?limit=20
     * Public
     */
    @GetMapping("/trending")
    public ApiResponse<RecommendationResponse> trending(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(recommendationService.trending(limit));
    }

    /**
     * GET /recommendations/similar/{songId}?limit=10
     * Public — content-based
     */
    @GetMapping("/similar/{songId}")
    public ApiResponse<RecommendationResponse> similar(
            @PathVariable UUID songId,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.success(recommendationService.similar(songId, limit));
    }

    /**
     * GET /recommendations/new-releases?limit=20
     * Public
     */
    @GetMapping("/new-releases")
    public ApiResponse<RecommendationResponse> newReleases(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(recommendationService.newReleases(limit));
    }
}
