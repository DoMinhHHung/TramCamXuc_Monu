package iuh.fit.se.socialservice.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;
import iuh.fit.se.socialservice.service.InternalRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/social")
@RequiredArgsConstructor
@Slf4j
public class InternalRecommendationController {

    private final InternalRecommendationService internalRecommendationService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper                  objectMapper;

    private static final Duration TTL_LISTEN  = Duration.ofMinutes(5);
    private static final Duration TTL_FOLLOWS = Duration.ofMinutes(10);
    private static final Duration TTL_REACTIONS = Duration.ofMinutes(5);

    @GetMapping("/listen-history/{userId}")
    public ResponseEntity<ApiResponse<List<ListenHistoryResponse>>> getListenHistory(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "90") int days) {

        String cacheKey = "rec:listen:" + userId + ":" + limit + ":" + days;
        List<ListenHistoryResponse> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = internalRecommendationService.getListenHistory(userId, limit, days);
            toCache(cacheKey, result, TTL_LISTEN);
            log.debug("Cache MISS listen-history userId={} → {} records", userId, result.size());
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/follows/{userId}/artists")
    public ResponseEntity<ApiResponse<List<String>>> getFollowedArtistIds(
            @PathVariable UUID userId) {

        String cacheKey = "rec:follows:artists:" + userId;
        List<String> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = internalRecommendationService.getFollowedArtistIds(userId);
            toCache(cacheKey, result, TTL_FOLLOWS);
            log.debug("Cache MISS followed-artists userId={} → {} artists", userId, result.size());
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/follows/{userId}/users")
    public ResponseEntity<ApiResponse<List<String>>> getFollowedUserIds(
            @PathVariable UUID userId) {

        String cacheKey = "rec:follows:users:" + userId;
        List<String> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = internalRecommendationService.getFollowedUserIds(userId);
            toCache(cacheKey, result, TTL_FOLLOWS);
            log.debug("Cache MISS followed-users userId={} → {} users", userId, result.size());
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private <T> T fromCache(String key, TypeReference<T> type) {
        try {
            Object raw = redisTemplate.opsForValue().get(key);
            if (raw != null) return objectMapper.convertValue(raw, type);
        } catch (Exception e) {
            log.warn("Cache read error key={}: {}", key, e.getMessage());
        }
        return null;
    }

    private void toCache(String key, Object value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            log.warn("Cache write error key={}: {}", key, e.getMessage());
        }
    }

    @GetMapping("/reactions/{userId}/liked")
    public ResponseEntity<ApiResponse<List<String>>> getLikedSongIds(
            @PathVariable UUID userId) {

        String cacheKey = "rec:reactions:liked:" + userId;
        List<String> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = internalRecommendationService.getLikedSongIds(userId);
            toCache(cacheKey, result, TTL_REACTIONS);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/reactions/{userId}/disliked")
    public ResponseEntity<ApiResponse<List<String>>> getDislikedSongIds(
            @PathVariable UUID userId) {

        String cacheKey = "rec:reactions:disliked:" + userId;
        List<String> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = internalRecommendationService.getDislikedSongIds(userId);
            toCache(cacheKey, result, TTL_REACTIONS);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}