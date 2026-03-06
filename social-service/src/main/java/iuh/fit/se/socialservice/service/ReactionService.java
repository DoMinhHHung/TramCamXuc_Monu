package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.ReactionResponse;
import iuh.fit.se.socialservice.enums.ReactionType;

import java.util.Map;
import java.util.UUID;

public interface ReactionService {
    ReactionResponse react(UUID userId, UUID songId, ReactionType type);
    void removeReaction(UUID userId, UUID songId);
    ReactionResponse getUserReaction(UUID userId, UUID songId);
    Map<ReactionType, Long> getSongReactionSummary(UUID songId);
}
