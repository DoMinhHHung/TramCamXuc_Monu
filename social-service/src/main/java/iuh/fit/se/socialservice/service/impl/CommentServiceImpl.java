package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Comment;
import iuh.fit.se.socialservice.document.CommentLike;
import iuh.fit.se.socialservice.dto.response.CommentResponse;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.CommentLikeRepository;
import iuh.fit.se.socialservice.repository.CommentRepository;
import iuh.fit.se.socialservice.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService {

    private static final Duration EDIT_WINDOW = Duration.ofMinutes(15);

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Override
    public CommentResponse addComment(UUID userId, UUID songId, String parentId, String content) {
        if (parentId != null) {
            commentRepository.findById(parentId)
                    .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
        }

        Comment comment = Comment.builder()
                .userId(userId)
                .songId(songId)
                .parentId(parentId)
                .content(content)
                .likeCount(0)
                .edited(false)
                .build();

        comment = commentRepository.save(comment);
        return toResponse(comment, userId);
    }

    @Override
    public CommentResponse updateComment(UUID userId, String commentId, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (comment.getCreatedAt() != null &&
                Instant.now().isAfter(comment.getCreatedAt().plus(EDIT_WINDOW))) {
            throw new AppException(ErrorCode.EDIT_WINDOW_EXPIRED);
        }

        comment.setContent(content);
        comment.setEdited(true);
        comment = commentRepository.save(comment);
        return toResponse(comment, userId);
    }

    @Override
    public void deleteComment(UUID userId, String commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        commentRepository.deleteById(commentId);
    }

    @Override
    public Page<CommentResponse> getSongComments(UUID songId, UUID currentUserId, Pageable pageable) {
        return commentRepository
                .findBySongIdAndParentIdIsNullOrderByCreatedAtDesc(songId, pageable)
                .map(c -> toResponse(c, currentUserId));
    }

    @Override
    public Page<CommentResponse> getReplies(String parentId, UUID currentUserId, Pageable pageable) {
        return commentRepository.findByParentIdOrderByCreatedAtAsc(parentId, pageable)
                .map(c -> toResponse(c, currentUserId));
    }

    @Override
    public long getCommentCount(UUID songId) {
        return commentRepository.countBySongIdAndParentIdIsNull(songId);
    }

    @Override
    public void likeComment(UUID userId, String commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        if (commentLikeRepository.existsByUserIdAndCommentId(userId, commentId)) {
            throw new AppException(ErrorCode.COMMENT_LIKE_CONFLICT);
        }

        CommentLike like = CommentLike.builder()
                .userId(userId)
                .commentId(commentId)
                .build();
        commentLikeRepository.save(like);

        comment.setLikeCount(comment.getLikeCount() + 1);
        commentRepository.save(comment);
    }

    @Override
    public void unlikeComment(UUID userId, String commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        commentLikeRepository.findByUserIdAndCommentId(userId, commentId)
                .ifPresent(like -> {
                    commentLikeRepository.delete(like);
                    comment.setLikeCount(Math.max(0, comment.getLikeCount() - 1));
                    commentRepository.save(comment);
                });
    }

    private CommentResponse toResponse(Comment comment, UUID currentUserId) {
        boolean liked = currentUserId != null &&
                commentLikeRepository.existsByUserIdAndCommentId(currentUserId, comment.getId());
        long replyCount = commentRepository.countByParentId(comment.getId());

        return CommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .songId(comment.getSongId())
                .parentId(comment.getParentId())
                .content(comment.getContent())
                .likeCount(comment.getLikeCount())
                .edited(comment.isEdited())
                .likedByCurrentUser(liked)
                .replyCount(replyCount)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
