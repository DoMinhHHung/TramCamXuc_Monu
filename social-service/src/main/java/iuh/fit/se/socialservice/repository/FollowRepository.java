package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.Follow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowRepository extends MongoRepository<Follow, String> {

    Optional<Follow> findByFollowerIdAndArtistId(UUID followerId, UUID artistId);

    boolean existsByFollowerIdAndArtistId(UUID followerId, UUID artistId);

    long countByArtistId(UUID artistId);

    long countByFollowerId(UUID followerId);

    Page<Follow> findByFollowerIdOrderByCreatedAtDesc(UUID followerId, Pageable pageable);

    Page<Follow> findByArtistIdOrderByCreatedAtDesc(UUID artistId, Pageable pageable);

    void deleteByFollowerIdAndArtistId(UUID followerId, UUID artistId);
}
