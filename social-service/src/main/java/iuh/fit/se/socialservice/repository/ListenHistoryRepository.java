package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.ListenHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ListenHistoryRepository extends MongoRepository<ListenHistory, String> {

    Page<ListenHistory> findByUserIdOrderByListenedAtDesc(UUID userId, Pageable pageable);

    long countBySongId(UUID songId);

    long countByArtistId(UUID artistId);

    @Query("{'artistId': ?0, 'listenedAt': {$gte: ?1, $lte: ?2}}")
    List<ListenHistory> findByArtistIdBetween(UUID artistId, Instant from, Instant to);

    @Query("{'userId': ?0, 'listenedAt': {$gte: ?1}}")
    List<ListenHistory> findRecentByUser(UUID userId, Instant since);
}
