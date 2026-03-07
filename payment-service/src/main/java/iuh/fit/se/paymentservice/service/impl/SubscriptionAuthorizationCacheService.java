package iuh.fit.se.paymentservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionAuthorizationCacheService {

    private static final String KEY_PREFIX = "user:subscription:";

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public void cacheActiveSubscription(UUID userId, Map<String, Object> features, LocalDateTime expiresAt) {
        if (userId == null || features == null || expiresAt == null) {
            return;
        }

        Duration ttl = Duration.between(LocalDateTime.now(), expiresAt);
        if (ttl.isNegative() || ttl.isZero()) {
            evict(userId);
            return;
        }

        try {
            Map<String, Object> authFeatures = new HashMap<>(features);
            normalizeAuthorizationFeatures(authFeatures);

            String payload = objectMapper.writeValueAsString(authFeatures);
            stringRedisTemplate.opsForValue().set(key(userId), payload, ttl);
            log.info("Cached subscription features for userId={} with ttl={}s", userId, ttl.getSeconds());
        } catch (Exception e) {
            log.error("Failed to cache subscription features for userId={}", userId, e);
        }
    }

    public void evict(UUID userId) {
        if (userId == null) {
            return;
        }
        stringRedisTemplate.delete(key(userId));
        log.info("Evicted cached subscription features for userId={}", userId);
    }

    private void normalizeAuthorizationFeatures(Map<String, Object> features) {
        if (!features.containsKey("maxBitrate")) {
            Object quality = features.get("quality");
            features.put("maxBitrate", mapQualityToBitrate(quality != null ? quality.toString() : null));
        }

        if (!features.containsKey("canDownload")) {
            Object download = features.get("download");
            if (download instanceof Boolean bool) {
                features.put("canDownload", bool);
            } else if (download instanceof String text) {
                features.put("canDownload", Boolean.parseBoolean(text));
            }
        }
    }

    private int mapQualityToBitrate(String quality) {
        if (quality == null) {
            return 64;
        }

        return switch (quality.toLowerCase()) {
            case "lossless", "320kbps", "320k" -> 320;
            case "256kbps", "256k" -> 256;
            case "128kbps", "128k" -> 128;
            default -> 64;
        };
    }

    private String key(UUID userId) {
        return KEY_PREFIX + userId;
    }
}
