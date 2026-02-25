package iuh.fit.se.social.repository;

import iuh.fit.se.social.document.Follow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface FollowRepository extends MongoRepository<Follow, String> {
    boolean existsByUserIdAndArtistId(UUID userId, UUID artistId);
    Optional<Follow> findByUserIdAndArtistId(UUID userId, UUID artistId);
    long countByArtistId(UUID artistId);
    long countByUserId(UUID userId);
    Page<Follow> findByArtistId(UUID artistId, Pageable pageable);
    Page<Follow> findByUserId(UUID userId, Pageable pageable);
}