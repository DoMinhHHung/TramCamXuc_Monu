package iuh.fit.se.recommendationservice.controller;

import iuh.fit.se.recommendationservice.dto.*;
import iuh.fit.se.recommendationservice.service.ListeningInsightsService;
import iuh.fit.se.recommendationservice.service.RecommendationOrchestratorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST API cho recommendation-service.
 *
 * Base path: /recommendations
 * (gateway route: Path=/recommendations/** → lb://RECOMMENDATION-SERVICE)
 *
 * ── Endpoint summary ─────────────────────────────────────────────────────────
 *
 *   GET  /recommendations/home                → Home feed (blended)
 *   GET  /recommendations/trending            → Global trending (public)
 *   GET  /recommendations/trending/genre/{id} → Genre trending (public)
 *   GET  /recommendations/social              → Social feed
 *   GET  /recommendations/similar/{songId}    → Similar songs
 *   GET  /recommendations/new-releases        → New releases from followed artists
 *   POST /recommendations/feedback            → User feedback
 *   GET  /recommendations/health              → Service + ML health check
 */
@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationOrchestratorService orchestrator;
    private final ListeningInsightsService insightsService;

    // ── Home feed ─────────────────────────────────────────────────────────────

    @GetMapping("/home")
    public ApiResponse<HomeRecommendationResponse> getHome(
            Authentication auth,
            @RequestParam(defaultValue = "false") boolean debug) {

        UUID userId = extractUserId(auth);
        return ApiResponse.ok(orchestrator.getHomeFeed(userId, debug));
    }

    // ── Trending ──────────────────────────────────────────────────────────────

    @GetMapping("/trending")
    public ApiResponse<List<RecommendedSongDto>> getTrending(
            Authentication auth,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = tryExtractUserId(auth);
        int safeLimit = Math.min(limit, 50);
        return ApiResponse.ok(orchestrator.getTrending(userId, safeLimit));
    }

    @GetMapping("/trending/genre/{genreId}")
    public ApiResponse<List<RecommendedSongDto>> getTrendingByGenre(
            Authentication auth,
            @PathVariable UUID genreId,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = tryExtractUserId(auth);
        return ApiResponse.ok(
                orchestrator.getTrendingByGenre(userId, genreId.toString(), Math.min(limit, 50)));
    }

    // ── Social feed ───────────────────────────────────────────────────────────

    @GetMapping("/social")
    public ApiResponse<List<RecommendedSongDto>> getSocialFeed(
            Authentication auth,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = extractUserId(auth);
        return ApiResponse.ok(orchestrator.getSocialFeed(userId, Math.min(limit, 50)));
    }

    // ── Similar songs ─────────────────────────────────────────────────────────

    @GetMapping("/similar/{songId}")
    public ApiResponse<List<RecommendedSongDto>> getSimilarSongs(
            Authentication auth,
            @PathVariable UUID songId,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = tryExtractUserId(auth);
        return ApiResponse.ok(
                orchestrator.getSimilarSongs(userId, songId, Math.min(limit, 50)));
    }

    // ── New releases ──────────────────────────────────────────────────────────

    @GetMapping("/new-releases")
    public ApiResponse<List<RecommendedSongDto>> getNewReleases(
            Authentication auth,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = extractUserId(auth);
        // Lấy từ social section của home feed
        HomeRecommendationResponse home = orchestrator.getHomeFeed(userId, false);
        List<RecommendedSongDto> releases = home.getNewReleases() != null
                ? home.getNewReleases() : java.util.Collections.emptyList();

        return ApiResponse.ok(
                releases.stream().limit(limit).collect(java.util.stream.Collectors.toList()));
    }

    // ── Feedback ──────────────────────────────────────────────────────────────


    @PostMapping("/feedback")
    public ApiResponse<Void> submitFeedback(
            Authentication auth,
            @Valid @RequestBody FeedbackRequest feedback) {

        UUID userId = extractUserId(auth);
        orchestrator.processFeedback(userId, feedback);
        return ApiResponse.<Void>builder()
                .code(1000)
                .message("Feedback received")
                .build();
    }

    // ── Health check ──────────────────────────────────────────────────────────


    @GetMapping("/health")
    public ApiResponse<java.util.Map<String, Object>> health() {
        return ApiResponse.ok(java.util.Map.of(
                "status", "UP",
                "service", "recommendation-service"
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID extractUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Authentication required");
        }
        return UUID.fromString((String) auth.getPrincipal());
    }

    private UUID tryExtractUserId(Authentication auth) {
        try {
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(auth.getPrincipal())) {
                return UUID.fromString((String) auth.getPrincipal());
            }
        } catch (Exception ignored) {}
        return null;
    }

    @GetMapping("/insights")
    public ApiResponse<ListeningInsightsResponse> getListeningInsights(
            Authentication auth,
            @RequestParam(defaultValue = "30") int days) {

        UUID userId = extractUserId(auth);

        int safeDays = (days <= 7) ? 7 : (days <= 30) ? 30 : 90;

        return ApiResponse.ok(insightsService.getInsights(userId, safeDays));
    }
}