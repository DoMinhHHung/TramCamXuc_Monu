package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.CommentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CommentService {
    CommentResponse addComment(UUID userId, UUID songId, String parentId, String content);
    CommentResponse updateComment(UUID userId, String commentId, String content);
    void deleteComment(UUID userId, String commentId);
    Page<CommentResponse> getSongComments(UUID songId, UUID currentUserId, Pageable pageable);
    Page<CommentResponse> getReplies(String parentId, UUID currentUserId, Pageable pageable);
    long getCommentCount(UUID songId);
    void likeComment(UUID userId, String commentId);
    void unlikeComment(UUID userId, String commentId);
}
