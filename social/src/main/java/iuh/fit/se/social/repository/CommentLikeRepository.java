package iuh.fit.se.social.repository;

import iuh.fit.se.social.document.CommentLike;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface CommentLikeRepository extends MongoRepository<CommentLike, String> {
    boolean existsByUserIdAndCommentId(UUID userId, String commentId);
    List<CommentLike> findByUserIdAndCommentIdIn(UUID userId, List<String> commentIds);
    long countByCommentId(String commentId);
    Long deleteByUserIdAndCommentId(UUID userId, String commentId);
}