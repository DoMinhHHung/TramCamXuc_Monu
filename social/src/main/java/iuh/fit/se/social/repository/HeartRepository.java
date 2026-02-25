package iuh.fit.se.social.repository;

import iuh.fit.se.social.document.Heart;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface HeartRepository extends MongoRepository<Heart, String> {
    boolean existsByUserIdAndArtistId(UUID userId, UUID artistId);
    Optional<Heart> findByUserIdAndArtistId(UUID userId, UUID artistId);
    long countByArtistId(UUID artistId);
}