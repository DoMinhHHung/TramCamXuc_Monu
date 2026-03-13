package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.FeedPost;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface FeedPostRepository extends MongoRepository<FeedPost, String> {

    // Profile feed — tất cả post của 1 owner theo visibility cho phép
    @Query("{'ownerId': ?0, 'visibility': {$in: ?1}}")
    Page<FeedPost> findByOwnerFiltered(UUID ownerId,
                                       List<String> visibilities,
                                       Pageable pageable);

    // Timeline — posts từ nhiều owner (fan-out on read)
    @Query("{'ownerId': {$in: ?0}, 'visibility': {$in: ?1}, 'createdAt': {$gte: ?2}}")
    List<FeedPost> findTimeline(List<UUID> ownerIds,
                                List<String> visibilities,
                                Instant since,
                                Pageable pageable);

    @Query(value = "{'ownerId': {$in: ?0}, 'visibility': {$in: ?1}, 'createdAt': {$gte: ?2}}",
            count = true)
    long countTimeline(List<UUID> ownerIds,
                       List<String> visibilities,
                       Instant since);

    // Idempotent check khi user share cùng 1 content nhiều lần
    boolean existsByContentIdAndContentTypeAndOwnerId(UUID contentId,
                                                      FeedPost.ContentType type,
                                                      UUID ownerId);

    long countByOwnerId(UUID ownerId);
}
