package iuh.fit.se.recommendationservice.controller;

import iuh.fit.se.recommendationservice.dto.*;
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

    // ── Home feed ─────────────────────────────────────────────────────────────

    /**
     * Home feed — tổng hợp tất cả sources.
     *
     * Response gồm nhiều sections:
     *   - forYou: CF + CB blended personalized
     *   - trendingNow: global trending
     *   - fromArtists: songs từ followed artists
     *   - newReleases: album/song mới
     *   - friendsAreListening: social signals
     *
     * Query params:
     *   debug=true → kèm theo debugScore (chỉ dùng khi dev)
     */
    @GetMapping("/home")
    public ApiResponse<HomeRecommendationResponse> getHome(
            Authentication auth,
            @RequestParam(defaultValue = "false") boolean debug) {

        UUID userId = extractUserId(auth);
        return ApiResponse.ok(orchestrator.getHomeFeed(userId, debug));
    }

    // ── Trending ──────────────────────────────────────────────────────────────

    /**
     * Global trending — PUBLIC, không cần đăng nhập.
     * Nếu có auth thì loại bỏ bài đã dislike.
     *
     * Query params:
     *   limit=20 (default), max=50
     */
    @GetMapping("/trending")
    public ApiResponse<List<RecommendedSongDto>> getTrending(
            Authentication auth,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = tryExtractUserId(auth);
        int safeLimit = Math.min(limit, 50);
        return ApiResponse.ok(orchestrator.getTrending(userId, safeLimit));
    }

    /**
     * Trending theo genre cụ thể — PUBLIC.
     * Hữu ích cho trang genre detail page.
     */
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

    /**
     * Social recommendation — friends + followed artists.
     * Cần đăng nhập.
     */
    @GetMapping("/social")
    public ApiResponse<List<RecommendedSongDto>> getSocialFeed(
            Authentication auth,
            @RequestParam(defaultValue = "20") int limit) {

        UUID userId = extractUserId(auth);
        return ApiResponse.ok(orchestrator.getSocialFeed(userId, Math.min(limit, 50)));
    }

    // ── Similar songs ─────────────────────────────────────────────────────────

    /**
     * Bài hát tương tự cho một bài cụ thể.
     * Dùng ở trang detail bài hát → "You might also like"
     * Không cần đăng nhập, nhưng nếu có auth thì filter disliked.
     */
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

    /**
     * New releases từ followed artists.
     * Cần đăng nhập (vì phụ thuộc vào danh sách followed artists).
     */
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

    /**
     * Nhận feedback từ client.
     * Client nên gửi feedback khi:
     *   - User skip bài sau < 10 giây → FeedbackType.SKIP
     *   - User replay bài → FeedbackType.REPLAY
     *   - User thêm vào playlist → FeedbackType.ADD_PLAYLIST
     *   - User bấm dislike → FeedbackType.DISLIKE
     *
     * NOTE: Với DISLIKE, client cũng cần gọi POST /social/reactions/dislike
     * để social-service lưu vào MongoDB. Endpoint này chỉ invalidate cache.
     */
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

    /**
     * Health check endpoint — kiểm tra Spring service và Python ML service.
     * Dùng bởi DevOps monitoring, không cần auth.
     */
    @GetMapping("/health")
    public ApiResponse<java.util.Map<String, Object>> health() {
        return ApiResponse.ok(java.util.Map.of(
                "status", "UP",
                "service", "recommendation-service"
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Extract userId, throw nếu không có auth (dùng cho protected endpoints) */
    private UUID extractUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Authentication required");
        }
        return UUID.fromString((String) auth.getPrincipal());
    }

    /** Try extract userId, return null nếu anonymous (dùng cho public endpoints) */
    private UUID tryExtractUserId(Authentication auth) {
        try {
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(auth.getPrincipal())) {
                return UUID.fromString((String) auth.getPrincipal());
            }
        } catch (Exception ignored) {}
        return null;
    }
}