package iuh.fit.se.recommendationservice.controller;

import iuh.fit.se.recommendationservice.dto.RecommendationResponse;
import iuh.fit.se.recommendationservice.service.HybridRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "Music recommendation endpoints")
public class RecommendationController {

    private final HybridRecommendationService recommendationService;

    /**
     * Gợi ý cá nhân hoá — kết hợp ML + rule-based fallback.
     * Nếu user cold-start (< 5 lượt nghe) → rule-based hoàn toàn.
     */
    @GetMapping("/for-you")
    @Operation(summary = "Personalised recommendations", security = @SecurityRequirement(name = "Bearer"))
    public ResponseEntity<RecommendationResponse> forYou(
            @AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(recommendationService.getForYou(userId, limit));
    }

    /**
     * Bài tương tự — content-based (ML) hoặc rule-based fallback.
     * Public nếu muốn, nhưng để authenticated để ghi nhận hành vi.
     */
    @GetMapping("/similar/{songId}")
    @Operation(summary = "Similar songs", security = @SecurityRequirement(name = "Bearer"))
    public ResponseEntity<RecommendationResponse> similar(
            @PathVariable String songId,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(recommendationService.getSimilarSongs(songId, limit));
    }

    /**
     * Trending toàn hệ thống
     */
    @GetMapping("/trending")
    @Operation(summary = "Trending songs (public)")
    public ResponseEntity<RecommendationResponse> trending(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(recommendationService.getTrending(limit));
    }

    /**
     * Bài mới từ artist đang follow.
     */
    @GetMapping("/new-releases")
    @Operation(summary = "New releases from followed artists", security = @SecurityRequirement(name = "Bearer"))
    public ResponseEntity<RecommendationResponse> newReleases(
            @AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(recommendationService.getNewReleases(userId, limit));
    }

    /**
     * Mix theo thể loại nghe nhiều nhất.
     */
    @GetMapping("/genre-mix")
    @Operation(summary = "Genre mix based on listening history", security = @SecurityRequirement(name = "Bearer"))
    public ResponseEntity<RecommendationResponse> genreMix(
            @AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(recommendationService.getGenreMix(userId, limit));
    }
}