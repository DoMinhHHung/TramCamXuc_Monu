package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.CommentLike;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommentLikeRepository extends MongoRepository<CommentLike, String> {

    Optional<CommentLike> findByUserIdAndCommentId(UUID userId, String commentId);

    boolean existsByUserIdAndCommentId(UUID userId, String commentId);

    void deleteByUserIdAndCommentId(UUID userId, String commentId);
}
