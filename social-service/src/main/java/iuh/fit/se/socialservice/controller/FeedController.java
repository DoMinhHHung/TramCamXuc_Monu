package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.FeedPostRequest;
import iuh.fit.se.socialservice.dto.response.FeedPostResponse;
import iuh.fit.se.socialservice.service.FeedService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FeedService feedService;

    /** GET /social/feed — timeline cá nhân (cần đăng nhập) */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<FeedPostResponse>>> timeline(
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                feedService.getTimeline(extractUserId(auth), pageable)));
    }

    /** GET /social/feed/owner/{ownerId} — profile feed (public) */
    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<ApiResponse<Page<FeedPostResponse>>> ownerFeed(
            @PathVariable UUID ownerId,
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID viewerId = tryExtract(auth);
        return ResponseEntity.ok(ApiResponse.success(
                feedService.getOwnerFeed(ownerId, viewerId, pageable)));
    }

    /** GET /social/feed/public — global public feed */
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<Page<FeedPostResponse>>> publicFeed(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
            feedService.getPublicFeed(pageable)));
    }

    /** POST /social/feed — tạo post mới (share hoặc text) */
    @PostMapping
    public ResponseEntity<ApiResponse<FeedPostResponse>> create(
            @Valid @RequestBody FeedPostRequest req,
            Authentication auth) {
        UUID   userId    = extractUserId(auth);
        String ownerType = extractRole(auth);   // "ARTIST" | "USER"
        return ResponseEntity.ok(ApiResponse.success(
                feedService.createPost(userId, ownerType, req)));
    }

    /** PATCH /social/feed/{postId} — sửa caption / visibility */
    @PatchMapping("/{postId}")
    public ResponseEntity<ApiResponse<FeedPostResponse>> update(
            @PathVariable String postId,
            @Valid @RequestBody FeedPostRequest req,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                feedService.updatePost(extractUserId(auth), postId, req)));
    }

    /** DELETE /social/feed/{postId} */
    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String postId,
            Authentication auth) {
        feedService.deletePost(extractUserId(auth), postId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000).message("Post deleted").build());
    }

    /** POST /social/feed/{postId}/like */
    @PostMapping("/{postId}/like")
    public ResponseEntity<ApiResponse<Void>> like(
            @PathVariable String postId, Authentication auth) {
        feedService.likePost(extractUserId(auth), postId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000).message("Liked").build());
    }

    /** DELETE /social/feed/{postId}/like */
    @DeleteMapping("/{postId}/like")
    public ResponseEntity<ApiResponse<Void>> unlike(
            @PathVariable String postId, Authentication auth) {
        feedService.unlikePost(extractUserId(auth), postId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000).message("Unliked").build());
    }

    private UUID   extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
    private UUID   tryExtract(Authentication auth) {
        try { return auth != null ? extractUserId(auth) : null; }
        catch (Exception e) { return null; }
    }
    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("USER");
    }
}