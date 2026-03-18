package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.FeedPostLike;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FeedPostLikeRepository extends MongoRepository<FeedPostLike, String> {
    boolean existsByUserIdAndPostId(UUID userId, String postId);
    void deleteByUserIdAndPostId(UUID userId, String postId);
    void deleteByPostId(String postId);
    long countByPostId(String postId);
}