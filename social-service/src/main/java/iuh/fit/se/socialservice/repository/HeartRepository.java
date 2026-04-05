package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.Heart;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HeartRepository extends MongoRepository<Heart, String> {

    Optional<Heart> findByUserIdAndSongId(UUID userId, UUID songId);

    boolean existsByUserIdAndSongId(UUID userId, UUID songId);

    long countBySongId(UUID songId);

    Page<Heart> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    void deleteByUserIdAndSongId(UUID userId, UUID songId);
}
