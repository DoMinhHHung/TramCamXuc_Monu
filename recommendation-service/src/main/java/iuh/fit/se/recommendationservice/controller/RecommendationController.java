package iuh.fit.se.recommendationservice.controller;

import iuh.fit.se.recommendationservice.dto.*;
import iuh.fit.se.recommendationservice.service.ListeningInsightsService;
import iuh.fit.se.recommendationservice.service.RecommendationOrchestratorService;
import iuh.fit.se.recommendationservice.service.SessionSignalService;
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
    private final SessionSignalService sessionSignalService;

    // ── Home feed ─────────────────────────────────────────────────────────────

    /**
     * Home feed với context-aware recommendation (Feature 1).
     * @param timeSlot  optional: EARLY_MORNING | MORNING | AFTERNOON | EVENING | NIGHT | LATE_NIGHT
     * @param mood      optional: HAPPY | SAD | STRESSED | FOCUSED | ROMANTIC | ENERGETIC
     * @param activity  optional: WORKING | EXERCISING | COMMUTING | RELAXING | STUDYING
     */
    @GetMapping("/home")
    public ApiResponse<HomeRecommendationResponse> getHome(
            Authentication auth,
            @RequestParam(defaultValue = "false") boolean debug,
            @RequestParam(required = false) ContextSignalDto.TimeSlot timeSlot,
            @RequestParam(required = false) ContextSignalDto.MoodType mood,
            @RequestParam(required = false) ContextSignalDto.ActivityType activity) {

        UUID userId = extractUserId(auth);
        ContextSignalDto context = ContextSignalDto.builder()
                .timeSlot(timeSlot).mood(mood).activity(activity).build();
        return ApiResponse.ok(orchestrator.getHomeFeed(userId, debug, context));
    }

    @GetMapping("/basic/home")
    public ApiResponse<HomeRecommendationResponse> getBasicHome(
            Authentication auth,
            @RequestParam(defaultValue = "false") boolean debug,
            @RequestParam(required = false) ContextSignalDto.TimeSlot timeSlot,
            @RequestParam(required = false) ContextSignalDto.MoodType mood) {

        UUID userId = extractUserId(auth);
        ContextSignalDto context = ContextSignalDto.builder().timeSlot(timeSlot).mood(mood).build();
        return ApiResponse.ok(orchestrator.getHomeFeedBasic(userId, debug, context));
    }

    @GetMapping("/advance/home")
    public ApiResponse<HomeRecommendationResponse> getAdvanceHome(
            Authentication auth,
            @RequestParam(defaultValue = "false") boolean debug,
            @RequestParam(required = false) ContextSignalDto.TimeSlot timeSlot,
            @RequestParam(required = false) ContextSignalDto.MoodType mood) {

        UUID userId = extractUserId(auth);
        ContextSignalDto context = ContextSignalDto.builder().timeSlot(timeSlot).mood(mood).build();
        return ApiResponse.ok(orchestrator.getHomeFeedAdvance(userId, debug, context));
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

    /**
     * Top 10 Xu Hướng — công thức kết hợp listen (50%) + engagement (30%) + velocity (15%) + freshness (5%).
     * Mỗi bài có rank (1-10) và trendBadge (🔥📈⭐🎵).
     * Cache 2 phút.
     */
    @GetMapping("/trending/top10")
    public ApiResponse<List<RecommendedSongDto>> getTop10Trending(Authentication auth) {
        UUID userId = tryExtractUserId(auth);
        return ApiResponse.ok(orchestrator.getTop10Trending(userId));
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

    @GetMapping("/basic/similar/{songId}")
    public ApiResponse<List<RecommendedSongDto>> getBasicSimilarSongs(
            Authentication auth,
            @PathVariable UUID songId,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = tryExtractUserId(auth);
        return ApiResponse.ok(
                orchestrator.getSimilarSongsBasic(userId, songId, Math.min(limit, 50)));
    }

    @GetMapping("/advance/similar/{songId}")
    public ApiResponse<List<RecommendedSongDto>> getAdvanceSimilarSongs(
            Authentication auth,
            @PathVariable UUID songId,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = tryExtractUserId(auth);
        return ApiResponse.ok(
                orchestrator.getSimilarSongsAdvance(userId, songId, Math.min(limit, 50)));
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

    // ── Session signals (Feature 2) ───────────────────────────────────────────

    /**
     * Ghi nhận session signal để re-rank real-time trong session.
     *
     * POST /recommendations/session/signal
     * Body: { songId, type (PLAYED|SKIPPED|SKIP_EARLY|REPEATED|COMPLETED), genreIds, artistId, playedSeconds }
     *
     * Client gọi mỗi khi:
     *   - Player bắt đầu phát bài (PLAYED)
     *   - User skip sau < 10s (SKIP_EARLY)
     *   - User skip bình thường (SKIPPED)
     *   - User nghe lại bài vừa xong (REPEATED)
     *   - Bài nghe đến cuối (COMPLETED)
     */
    @PostMapping("/session/signal")
    public ApiResponse<Void> recordSessionSignal(
            Authentication auth,
            @RequestBody SessionSignalDto signal) {

        UUID userId = extractUserId(auth);
        sessionSignalService.recordSignal(userId, signal);
        return ApiResponse.<Void>builder()
                .code(1000)
                .message("Signal recorded")
                .build();
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
