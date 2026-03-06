package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.Reaction;
import iuh.fit.se.socialservice.enums.ReactionType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReactionRepository extends MongoRepository<Reaction, String> {

    Optional<Reaction> findByUserIdAndSongId(UUID userId, UUID songId);

    boolean existsByUserIdAndSongId(UUID userId, UUID songId);

    List<Reaction> findBySongId(UUID songId);

    long countBySongIdAndType(UUID songId, ReactionType type);

    void deleteByUserIdAndSongId(UUID userId, UUID songId);

    @Query(value = "{'songId': ?0}", fields = "{'type': 1}")
    List<Reaction> findReactionTypesBySongId(UUID songId);
}
