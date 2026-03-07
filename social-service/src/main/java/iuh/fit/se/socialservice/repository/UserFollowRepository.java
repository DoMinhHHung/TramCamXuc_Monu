package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.UserFollow;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserFollowRepository extends MongoRepository<UserFollow, String> {

    boolean existsByFollowerIdAndFolloweeId(UUID followerId, UUID followeeId);

    void deleteByFollowerIdAndFolloweeId(UUID followerId, UUID followeeId);

    @Query(value = "{'followerId': ?0}", fields = "{'followeeId': 1, '_id': 0}")
    List<UserFollow> findFolloweeIdsByFollowerId(UUID followerId);
}

