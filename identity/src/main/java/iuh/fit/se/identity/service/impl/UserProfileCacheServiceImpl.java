package iuh.fit.se.identity.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.Role;
import iuh.fit.se.identity.service.UserProfileCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileCacheServiceImpl implements UserProfileCacheService {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public String buildCacheKey(String userId) {
        return "user:profile:" + userId;
    }

    @Override
    public void cacheUserProfile(User user) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("role", defaultRole(user.getRole()));
            payload.put("plan", user.getSubscriptionPlan() == null ? "FREE" : user.getSubscriptionPlan());
            String json = objectMapper.writeValueAsString(payload);
            stringRedisTemplate.opsForValue().set(buildCacheKey(user.getId().toString()), json, Duration.ofHours(6));
        } catch (Exception e) {
            log.warn("Failed to cache profile for user {}", user.getId(), e);
        }
    }

    @Override
    public void evictUserProfile(String userId) {
        try {
            stringRedisTemplate.delete(buildCacheKey(userId));
        } catch (Exception e) {
            log.warn("Failed to evict profile cache for user {}", userId, e);
        }
    }

    @Override
    public String defaultRole(Role role) {
        if (role == null) return "ROLE_USER";
        return "ROLE_" + role.name();
    }
}
