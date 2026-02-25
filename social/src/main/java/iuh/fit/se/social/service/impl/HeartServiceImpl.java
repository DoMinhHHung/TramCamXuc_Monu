package iuh.fit.se.social.service.impl;

import iuh.fit.se.social.document.Heart;
import iuh.fit.se.social.repository.HeartRepository;
import iuh.fit.se.social.service.HeartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeartServiceImpl implements HeartService {

    private final HeartRepository heartRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String KEY_HEART_COUNT = "social:heart:count:";

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Override
    public void toggleHeart(UUID artistId) {
        UUID userId = currentUserId();
        String cacheKey = KEY_HEART_COUNT + artistId;

        if (heartRepository.existsByUserIdAndArtistId(userId, artistId)) {
            heartRepository.findByUserIdAndArtistId(userId, artistId)
                    .ifPresent(heartRepository::delete);
            redisTemplate.delete(cacheKey);
            log.info("User {} un-hearted artist {}", userId, artistId);
        } else {
            heartRepository.save(Heart.builder()
                    .userId(userId)
                    .artistId(artistId)
                    .build());
            redisTemplate.delete(cacheKey);
            log.info("User {} hearted artist {}", userId, artistId);
        }
    }
}