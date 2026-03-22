package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionCacheWarmupService {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Async
    public void warm(UUID userId, Map<String, Object> features, LocalDateTime expiresAt) {
        if (userId == null || features == null || expiresAt == null) {
            return;
        }

        Duration ttl = Duration.between(LocalDateTime.now(), expiresAt);
        if (ttl.isNegative() || ttl.isZero()) {
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(features);
            String key = "user:subscription:" + userId;
            Boolean set = stringRedisTemplate.opsForValue().setIfAbsent(key, payload, ttl);
            if (Boolean.TRUE.equals(set)) {
                log.debug("[CacheWarmup] Set subscription cache for userId={}", userId);
            } else {
                log.debug("[CacheWarmup] Cache already set by payment-service, skipping");
            }
        } catch (Exception e) {
            log.warn("Failed to warm subscription cache for userId={}", userId, e);
        }
    }
}
