// social/.../repository/ListenHistoryRepository.java
package iuh.fit.se.social.repository;

import iuh.fit.se.social.document.ListenHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ListenHistoryRepository extends MongoRepository<ListenHistory, String> {

    @Query("{ 'meta.userId': ?0, 'listenedAt': { $gte: ?1 } }")
    List<ListenHistory> findByUserIdSince(UUID userId, Instant since);

    @Query(value = "{ 'meta.artistId': ?0, 'listenedAt': { $gte: ?1 } }",
            count = true)
    long countByArtistIdSince(UUID artistId, Instant since);
}