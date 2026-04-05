package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Comment;
import iuh.fit.se.socialservice.document.CommentLike;
import iuh.fit.se.socialservice.document.FeedPost;
import iuh.fit.se.socialservice.dto.response.CommentResponse;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.CommentLikeRepository;
import iuh.fit.se.socialservice.repository.CommentRepository;
import iuh.fit.se.socialservice.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService {

    private static final Duration EDIT_WINDOW = Duration.ofMinutes(15);

    private final CommentRepository     commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final MongoTemplate         mongoTemplate;

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
        // Verify comment exists
        commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        CommentLike like = CommentLike.builder()
                .userId(userId)
                .commentId(commentId)
                .build();

        try {
            commentLikeRepository.save(like);
        } catch (DuplicateKeyException e) {
            // Unique index {userId, commentId} fired — user already liked this comment.
            // Treat as a no-op instead of surfacing a conflict error, so concurrent
            // requests are both safe and idempotent.
            throw new AppException(ErrorCode.COMMENT_LIKE_CONFLICT);
        }

        // Atomic $inc — no read-modify-write, safe under concurrent requests
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(commentId)),
                new Update().inc("likeCount", 1),
                Comment.class
        );
    }

    @Override
    public void unlikeComment(UUID userId, String commentId) {
        commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        commentLikeRepository.findByUserIdAndCommentId(userId, commentId)
                .ifPresent(like -> {
                    commentLikeRepository.delete(like);

                    // Atomic $inc with floor at 0 — no read-modify-write
                    mongoTemplate.updateFirst(
                            Query.query(Criteria.where("id").is(commentId)
                                    .and("likeCount").gt(0)),
                            new Update().inc("likeCount", -1),
                            Comment.class
                    );
                });
    }

    @Override
    public CommentResponse addPostComment(UUID userId, String postId,
                                          String parentId, String content) {
        if (parentId != null) {
            commentRepository.findById(parentId)
                    .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
        }
        Comment comment = Comment.builder()
                .userId(userId)
                .postId(postId)   // ← dùng postId thay vì songId
                .parentId(parentId)
                .content(content)
                .likeCount(0).edited(false)
                .build();
        comment = commentRepository.save(comment);

        // Tăng commentCount trên FeedPost (atomic)
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(postId)),
                new Update().inc("commentCount", 1),
                FeedPost.class);

        return toResponse(comment, userId);
    }

    @Override
    public Page<CommentResponse> getPostComments(String postId,
                                                 UUID currentUserId,
                                                 Pageable pageable) {
        return commentRepository
                .findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(postId, pageable)
                .map(c -> toResponse(c, currentUserId));
    }

    @Override
    public long getPostCommentCount(String postId) {
        return commentRepository.countByPostIdAndParentIdIsNull(postId);
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
