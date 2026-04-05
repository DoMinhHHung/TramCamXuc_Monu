package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.CommentRequest;
import iuh.fit.se.socialservice.dto.request.CommentUpdateRequest;
import iuh.fit.se.socialservice.dto.request.PostCommentRequest;
import iuh.fit.se.socialservice.dto.response.CommentResponse;
import iuh.fit.se.socialservice.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /** GET /social/comments?songId=... — public: list top-level comments */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @RequestParam UUID songId,
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = auth != null ? tryExtract(auth) : null;
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getSongComments(songId, userId, pageable)));
    }

    /** GET /social/comments/count?songId=... — public */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getCommentCount(@RequestParam UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(commentService.getCommentCount(songId)));
    }

    /** GET /social/comments/{parentId}/replies */
    @GetMapping("/{parentId}/replies")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getReplies(
            @PathVariable String parentId,
            Authentication auth,
            @PageableDefault(size = 10) Pageable pageable) {
        UUID userId = auth != null ? tryExtract(auth) : null;
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getReplies(parentId, userId, pageable)));
    }

    /** POST /social/comments — add a comment or reply */
    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @Valid @RequestBody CommentRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(
                commentService.addComment(userId, req.getSongId(), req.getParentId(), req.getContent())));
    }

    /** PATCH /social/comments/{commentId} — edit within 15-min window */
    @PatchMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable String commentId,
            @Valid @RequestBody CommentUpdateRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(
                commentService.updateComment(userId, commentId, req.getContent())));
    }

    /** DELETE /social/comments/{commentId} */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable String commentId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        commentService.deleteComment(userId, commentId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code(1000).message("Comment deleted").build());
    }

    /** POST /social/comments/{commentId}/like */
    @PostMapping("/{commentId}/like")
    public ResponseEntity<ApiResponse<Void>> likeComment(
            @PathVariable String commentId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        commentService.likeComment(userId, commentId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code(1000).message("Liked").build());
    }

    /** DELETE /social/comments/{commentId}/like */
    @DeleteMapping("/{commentId}/like")
    public ResponseEntity<ApiResponse<Void>> unlikeComment(
            @PathVariable String commentId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        commentService.unlikeComment(userId, commentId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code(1000).message("Unliked").build());
    }

    /** GET /social/comments/post?postId=... — comments của 1 feed post */
    @GetMapping("/post")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getPostComments(
            @RequestParam String postId,
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = auth != null ? tryExtract(auth) : null;
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getPostComments(postId, userId, pageable)));
    }

    /** GET /social/comments/post/count?postId=... */
    @GetMapping("/post/count")
    public ResponseEntity<ApiResponse<Long>> getPostCommentCount(
            @RequestParam String postId) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getPostCommentCount(postId)));
    }

    /** POST /social/comments/post — thêm comment vào feed post */
    @PostMapping("/post")
    public ResponseEntity<ApiResponse<CommentResponse>> addPostComment(
            @Valid @RequestBody PostCommentRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(
                commentService.addPostComment(userId,
                        req.getPostId(), req.getParentId(), req.getContent())));
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }

    private UUID tryExtract(Authentication auth) {
        try { return UUID.fromString((String) auth.getPrincipal()); } catch (Exception e) { return null; }
    }
}
