package iuh.fit.se.social.service.impl;

import iuh.fit.se.social.document.Follow;
import iuh.fit.se.social.dto.response.ArtistSocialStatsResponse;
import iuh.fit.se.social.repository.FollowRepository;
import iuh.fit.se.social.repository.HeartRepository;
import iuh.fit.se.social.service.FollowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowServiceImpl implements FollowService {

    private final FollowRepository followRepository;
    private final HeartRepository heartRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String KEY_FOLLOW_COUNT = "social:follow:count:";
    private static final String KEY_HEART_COUNT  = "social:heart:count:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Override
    public void toggleFollow(UUID artistId) {
        UUID userId = currentUserId();
        String cacheKey = KEY_FOLLOW_COUNT + artistId;

        if (followRepository.existsByUserIdAndArtistId(userId, artistId)) {
            followRepository.findByUserIdAndArtistId(userId, artistId)
                    .ifPresent(followRepository::delete);
            redisTemplate.delete(cacheKey);
            log.info("User {} unfollowed artist {}", userId, artistId);
        } else {
            followRepository.save(Follow.builder()
                    .userId(userId)
                    .artistId(artistId)
                    .build());
            redisTemplate.delete(cacheKey);
            log.info("User {} followed artist {}", userId, artistId);
        }
    }

    @Override
    public ArtistSocialStatsResponse getArtistStats(UUID artistId) {
        UUID userId = tryGetCurrentUserId();

        long followerCount = getCachedCount(KEY_FOLLOW_COUNT + artistId,
                () -> followRepository.countByArtistId(artistId));
        long heartCount = getCachedCount(KEY_HEART_COUNT + artistId,
                () -> heartRepository.countByArtistId(artistId));

        boolean followedByMe = userId != null
                && followRepository.existsByUserIdAndArtistId(userId, artistId);
        boolean heartedByMe = userId != null
                && heartRepository.existsByUserIdAndArtistId(userId, artistId);

        return ArtistSocialStatsResponse.builder()
                .artistId(artistId)
                .followerCount(followerCount)
                .heartCount(heartCount)
                .followedByMe(followedByMe)
                .heartedByMe(heartedByMe)
                .build();
    }

    private long getCachedCount(String key, CountSupplier supplier) {
        Object cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return Long.parseLong(cached.toString());
        }
        long count = supplier.get();
        redisTemplate.opsForValue().set(key, count, CACHE_TTL);
        return count;
    }

    private UUID tryGetCurrentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()
                    || "anonymousUser".equals(auth.getPrincipal())) return null;
            return UUID.fromString(auth.getName());
        } catch (Exception e) {
            return null;
        }
    }

    @FunctionalInterface
    interface CountSupplier {
        long get();
    }
}