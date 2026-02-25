package iuh.fit.se.social.service;

import iuh.fit.se.social.dto.request.CommentRequest;
import iuh.fit.se.social.dto.request.EditCommentRequest;
import iuh.fit.se.social.dto.response.CommentResponse;
import iuh.fit.se.social.enums.TargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CommentService {
    CommentResponse addComment(UUID targetId, TargetType targetType, CommentRequest request);
    CommentResponse editComment(String commentId, EditCommentRequest request);
    Page<CommentResponse> getComments(UUID targetId, TargetType targetType, Pageable pageable);
    void deleteComment(String commentId);
    long countComments(UUID targetId, TargetType targetType);
    CommentResponse toggleLike(String commentId);
}