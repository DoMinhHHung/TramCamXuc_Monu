package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.Reaction;
import iuh.fit.se.socialservice.enums.ReactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReactionRepository extends MongoRepository<Reaction, String> {

    Optional<Reaction> findByUserIdAndSongId(UUID userId, UUID songId);

    boolean existsByUserIdAndSongId(UUID userId, UUID songId);

    long countBySongIdAndType(UUID songId, ReactionType type);

    void deleteByUserIdAndSongId(UUID userId, UUID songId);

    Page<Reaction> findBySongIdAndTypeOrderByCreatedAtDesc(UUID songId, ReactionType type, Pageable pageable);

    List<Reaction> findBySongId(UUID songId);

    /** Tổng LIKE / DISLIKE theo artist — dùng cho ArtistStatsResponse */
    long countByArtistIdAndType(UUID artistId, ReactionType type);
}

