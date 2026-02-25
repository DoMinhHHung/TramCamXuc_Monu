package iuh.fit.se.social.service.impl;

import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.social.document.Comment;
import iuh.fit.se.social.document.CommentLike;
import iuh.fit.se.social.dto.request.CommentRequest;
import iuh.fit.se.social.dto.request.EditCommentRequest;
import iuh.fit.se.social.dto.response.CommentResponse;
import iuh.fit.se.social.enums.TargetType;
import iuh.fit.se.social.repository.CommentLikeRepository;
import iuh.fit.se.social.repository.CommentRepository;
import iuh.fit.se.social.service.CommentService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final MongoTemplate mongoTemplate;

    private static final long EDIT_WINDOW_MINUTES = 30;
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private String getUserName() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth.getCredentials() instanceof Claims claims) {
                return claims.get("name", String.class);
            }
            return "User";
        } catch (Exception e) { return "User"; }
    }

    @Override
    public CommentResponse addComment(UUID targetId, TargetType targetType, CommentRequest request) {
        UUID userId = currentUserId();

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
            if (parent.getParentId() != null) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }
        }

        Comment comment = Comment.builder()
                .userId(userId)
                .userFullName(getUserName())
                .targetId(targetId)
                .targetType(targetType)
                .content(request.getContent())
                .parentId(request.getParentId())
                .deleted(false)
                .likeCount(0)
                .build();

        comment = commentRepository.save(comment);

        redisTemplate.delete("social:comment:count:" + targetType + ":" + targetId);

        return buildResponseRecord(comment, List.of(), false);
    }

    @Override
    public CommentResponse editComment(String commentId, EditCommentRequest request) {
        UUID userId = currentUserId();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (comment.isDeleted()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        LocalDateTime deadline = comment.getCreatedAt().plusMinutes(EDIT_WINDOW_MINUTES);
        if (LocalDateTime.now().isAfter(deadline)) {
            throw new AppException(ErrorCode.EDIT_WINDOW_EXPIRED);
        }

        comment.setContent(request.getContent());
        comment.setEditedAt(LocalDateTime.now());
        comment = commentRepository.save(comment);

        boolean isLiked = commentLikeRepository.existsByUserIdAndCommentId(userId, commentId);

        return buildResponseRecord(comment, List.of(), isLiked);
    }

    @Override
    public Page<CommentResponse> getComments(UUID targetId, TargetType targetType, Pageable pageable) {
        Page<Comment> parentPage = commentRepository
                .findByTargetIdAndTargetTypeAndParentIdIsNullAndDeletedFalse(targetId, targetType, pageable);

        if (parentPage.isEmpty()) return parentPage.map(c -> null);

        List<String> parentIds = parentPage.getContent().stream().map(Comment::getId).toList();
        List<Comment> allReplies = commentRepository.findByParentIdInAndDeletedFalse(parentIds);

        List<String> allCommentIds = new ArrayList<>(parentIds);
        allReplies.forEach(reply -> allCommentIds.add(reply.getId()));

        UUID userId = currentUserId();
        Set<String> likedCommentIds = new HashSet<>();
        if (userId != null) {
            List<CommentLike> userLikes = commentLikeRepository.findByUserIdAndCommentIdIn(userId, allCommentIds);
            userLikes.forEach(like -> likedCommentIds.add(like.getCommentId()));
        }

        return parentPage.map(parent -> {
            List<CommentResponse> replyResponses = allReplies.stream()
                    .filter(reply -> reply.getParentId().equals(parent.getId()))
                    .map(reply -> buildResponseRecord(reply, List.of(), likedCommentIds.contains(reply.getId())))
                    .toList();

            return buildResponseRecord(parent, replyResponses, likedCommentIds.contains(parent.getId()));
        });
    }

    @Override
    public void deleteComment(String commentId) {
        UUID userId = currentUserId();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        boolean isOwner = comment.getUserId().equals(userId);
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isOwner && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        comment.setDeleted(true);
        comment.setContent("[Bình luận đã bị xóa]");
        commentRepository.save(comment);

        redisTemplate.delete("social:comment:count:" + comment.getTargetType() + ":" + comment.getTargetId());
    }

    @Override
    public long countComments(UUID targetId, TargetType targetType) {
        String key = "social:comment:count:" + targetType + ":" + targetId;
        Object cached = redisTemplate.opsForValue().get(key);
        if (cached != null) return Long.parseLong(cached.toString());

        long count = commentRepository.countByTargetIdAndTargetTypeAndDeletedFalse(targetId, targetType);
        redisTemplate.opsForValue().set(key, count, CACHE_TTL);
        return count;
    }

    @Override
    public CommentResponse toggleLike(String commentId) {
        UUID userId = currentUserId();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (comment.isDeleted()) throw new AppException(ErrorCode.INVALID_REQUEST);

        boolean isLiked;
        long likeDelta = 0;

        try {
            commentLikeRepository.save(CommentLike.builder().userId(userId).commentId(commentId).build());
            isLiked = true;
            likeDelta = 1;
        } catch (DuplicateKeyException e) {
            long deletedCount = commentLikeRepository.deleteByUserIdAndCommentId(userId, commentId);
            if (deletedCount > 0) {
                isLiked = false;
                likeDelta = -1;
            } else {
                isLiked = false;
            }
        }

        if (likeDelta != 0) {
            Query query = new Query(Criteria.where("id").is(commentId));
            Update update = new Update().inc("likeCount", likeDelta);
            mongoTemplate.updateFirst(query, update, Comment.class);
            comment.setLikeCount(comment.getLikeCount() + likeDelta);
        }

        return buildResponseRecord(comment, List.of(), isLiked);
    }

    private CommentResponse buildResponseRecord(Comment comment, List<CommentResponse> replies, boolean isLiked) {
        return CommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userFullName(comment.getUserFullName())
                .userAvatarUrl(comment.getUserAvatarUrl())
                .content(comment.isDeleted() ? "[Bình luận đã bị xóa]" : comment.getContent())
                .parentId(comment.getParentId())
                .deleted(comment.isDeleted())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getEditedAt() != null ? comment.getEditedAt() : comment.getUpdatedAt())
                .likeCount(comment.getLikeCount())
                .likedByMe(isLiked)
                .replies(replies)
                .build();
    }
}