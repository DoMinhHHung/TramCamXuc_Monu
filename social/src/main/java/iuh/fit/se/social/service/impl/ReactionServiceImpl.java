package iuh.fit.se.social.service.impl;

import iuh.fit.se.social.document.Reaction;
import iuh.fit.se.social.dto.response.ReactionStatsResponse;
import iuh.fit.se.social.enums.ReactionType;
import iuh.fit.se.social.enums.TargetType;
import iuh.fit.se.social.repository.ReactionRepository;
import iuh.fit.se.social.service.ReactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReactionServiceImpl implements ReactionService {

    private final ReactionRepository reactionRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private UUID tryGetCurrentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()
                    || "anonymousUser".equals(auth.getPrincipal())) return null;
            return UUID.fromString(auth.getName());
        } catch (Exception e) { return null; }
    }

    private String likeKey(UUID targetId, TargetType type) {
        return "social:like:" + type + ":" + targetId;
    }

    private String dislikeKey(UUID targetId, TargetType type) {
        return "social:dislike:" + type + ":" + targetId;
    }

    @Override
    public ReactionStatsResponse react(UUID targetId, TargetType targetType, ReactionType reactionType) {
        UUID userId = currentUserId();

        Optional<Reaction> existing = reactionRepository
                .findByUserIdAndTargetIdAndTargetType(userId, targetId, targetType);

        if (existing.isPresent()) {
            Reaction reaction = existing.get();
            if (reaction.getReactionType() == reactionType) {
                // Bấm lại cùng loại → toggle off (xóa reaction)
                reactionRepository.delete(reaction);
            } else {
                // Đổi loại reaction
                reaction.setReactionType(reactionType);
                reactionRepository.save(reaction);
            }
        } else {
            reactionRepository.save(Reaction.builder()
                    .userId(userId)
                    .targetId(targetId)
                    .targetType(targetType)
                    .reactionType(reactionType)
                    .build());
        }

        // Invalidate cache
        redisTemplate.delete(likeKey(targetId, targetType));
        redisTemplate.delete(dislikeKey(targetId, targetType));

        return getStats(targetId, targetType);
    }

    @Override
    public void removeReaction(UUID targetId, TargetType targetType) {
        UUID userId = currentUserId();
        reactionRepository.findByUserIdAndTargetIdAndTargetType(userId, targetId, targetType)
                .ifPresent(reactionRepository::delete);
        redisTemplate.delete(likeKey(targetId, targetType));
        redisTemplate.delete(dislikeKey(targetId, targetType));
    }

    @Override
    public ReactionStatsResponse getStats(UUID targetId, TargetType targetType) {
        UUID userId = tryGetCurrentUserId();

        long likeCount = getCached(likeKey(targetId, targetType),
                () -> reactionRepository.countByTargetIdAndTargetTypeAndReactionType(
                        targetId, targetType, ReactionType.LIKE));

        long dislikeCount = getCached(dislikeKey(targetId, targetType),
                () -> reactionRepository.countByTargetIdAndTargetTypeAndReactionType(
                        targetId, targetType, ReactionType.DISLIKE));

        ReactionType myReaction = null;
        if (userId != null) {
            myReaction = reactionRepository
                    .findByUserIdAndTargetIdAndTargetType(userId, targetId, targetType)
                    .map(Reaction::getReactionType)
                    .orElse(null);
        }

        return ReactionStatsResponse.builder()
                .targetId(targetId)
                .targetType(targetType)
                .likeCount(likeCount)
                .dislikeCount(dislikeCount)
                .myReaction(myReaction)
                .build();
    }

    private long getCached(String key, CountSupplier supplier) {
        Object cached = redisTemplate.opsForValue().get(key);
        if (cached != null) return Long.parseLong(cached.toString());
        long count = supplier.get();
        redisTemplate.opsForValue().set(key, count, CACHE_TTL);
        return count;
    }

    @FunctionalInterface
    interface CountSupplier { long get(); }
}