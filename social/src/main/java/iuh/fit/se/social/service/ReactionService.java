package iuh.fit.se.social.service;

import iuh.fit.se.social.dto.response.ReactionStatsResponse;
import iuh.fit.se.social.enums.ReactionType;
import iuh.fit.se.social.enums.TargetType;

import java.util.UUID;

public interface ReactionService {
    ReactionStatsResponse react(UUID targetId, TargetType targetType, ReactionType reactionType);
    void removeReaction(UUID targetId, TargetType targetType);
    ReactionStatsResponse getStats(UUID targetId, TargetType targetType);
}