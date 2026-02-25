// social/.../controller/CommentController.java
package iuh.fit.se.social.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.social.dto.request.CommentRequest;
import iuh.fit.se.social.dto.request.EditCommentRequest;
import iuh.fit.se.social.dto.response.CommentResponse;
import iuh.fit.se.social.enums.TargetType;
import iuh.fit.se.social.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /** Lấy comments của playlist hoặc album (phân trang) */
    @GetMapping
    public ApiResponse<Page<CommentResponse>> getComments(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<Page<CommentResponse>>builder()
                .result(commentService.getComments(
                        targetId, targetType,
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    /** Thêm comment / reply */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommentResponse> addComment(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType,
            @RequestBody @Valid CommentRequest request) {
        return ApiResponse.<CommentResponse>builder()
                .result(commentService.addComment(targetId, targetType, request))
                .build();
    }

    @PutMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommentResponse> editComment(
            @PathVariable String commentId,
            @RequestBody @Valid EditCommentRequest request) {
        return ApiResponse.<CommentResponse>builder()
                .result(commentService.editComment(commentId, request))
                .build();
    }

    /** Xóa comment (soft-delete) */
    @DeleteMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> deleteComment(@PathVariable String commentId) {
        commentService.deleteComment(commentId);
        return ApiResponse.<Void>builder().message("Comment deleted.").build();
    }

    /** Đếm số comment */
    @GetMapping("/count")
    public ApiResponse<Long> countComments(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType) {
        return ApiResponse.<Long>builder()
                .result(commentService.countComments(targetId, targetType))
                .build();
    }

    @PostMapping("/{commentId}/like")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommentResponse> toggleLike(@PathVariable String commentId) {
        return ApiResponse.<CommentResponse>builder()
                .result(commentService.toggleLike(commentId))
                .build();
    }
}