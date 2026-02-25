package iuh.fit.se.social.repository;

import iuh.fit.se.social.document.Reaction;
import iuh.fit.se.social.enums.ReactionType;
import iuh.fit.se.social.enums.TargetType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReactionRepository extends MongoRepository<Reaction, String> {
    Optional<Reaction> findByUserIdAndTargetIdAndTargetType(UUID userId, UUID targetId, TargetType targetType);
    long countByTargetIdAndTargetTypeAndReactionType(UUID targetId, TargetType targetType, ReactionType reactionType);
}