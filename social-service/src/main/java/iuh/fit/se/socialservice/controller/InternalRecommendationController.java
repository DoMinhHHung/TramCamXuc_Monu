package iuh.fit.se.socialservice.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.socialservice.document.ListenHistory;
import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;
import iuh.fit.se.socialservice.repository.FollowRepository;
import iuh.fit.se.socialservice.repository.ListenHistoryRepository;
import iuh.fit.se.socialservice.repository.UserFollowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Internal endpoints consumed exclusively by recommendation-service via Feign.
 * All responses are cached in Redis to minimise MongoDB load.
 *
 * Base path: /api/v1  (matches SocialServiceClient Feign path)
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class InternalRecommendationController {

    private final ListenHistoryRepository listenHistoryRepository;
    private final FollowRepository        followRepository;
    private final UserFollowRepository    userFollowRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper            objectMapper;

    private static final Duration TTL_LISTEN  = Duration.ofMinutes(5);
    private static final Duration TTL_FOLLOWS = Duration.ofMinutes(10);

    // ── GET /api/v1/listen-history/{userId}?limit=50&days=90 ──────────────────

    @GetMapping("/listen-history/{userId}")
    public ResponseEntity<ApiResponse<List<ListenHistoryResponse>>> getListenHistory(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "90") int days) {

        String cacheKey = "rec:listen:" + userId + ":" + limit + ":" + days;
        List<ListenHistoryResponse> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            Instant since = Instant.now().minus(Duration.ofDays(days));
            List<ListenHistory> raw = listenHistoryRepository.findRecentByUserSorted(
                    userId, since, PageRequest.of(0, limit));

            result = raw.stream().map(h -> ListenHistoryResponse.builder()
                    .id(h.getId())
                    .userId(h.getUserId())
                    .songId(h.getSongId())
                    .artistId(h.getArtistId())
                    .playlistId(h.getPlaylistId())
                    .albumId(h.getAlbumId())
                    .durationSeconds(h.getDurationSeconds())
                    .listenedAt(h.getListenedAt())
                    .build()).collect(Collectors.toList());

            toCache(cacheKey, result, TTL_LISTEN);
            log.debug("Cache MISS listen-history userId={} → {} records", userId, result.size());
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── GET /api/v1/follows/{userId}/artists ──────────────────────────────────

    @GetMapping("/follows/{userId}/artists")
    public ResponseEntity<ApiResponse<List<String>>> getFollowedArtistIds(
            @PathVariable UUID userId) {

        String cacheKey = "rec:follows:artists:" + userId;
        List<String> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = followRepository.findArtistIdsByFollowerId(userId).stream()
                    .map(f -> f.getArtistId().toString())
                    .collect(Collectors.toList());
            toCache(cacheKey, result, TTL_FOLLOWS);
            log.debug("Cache MISS followed-artists userId={} → {} artists", userId, result.size());
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── GET /api/v1/follows/{userId}/users ────────────────────────────────────

    @GetMapping("/follows/{userId}/users")
    public ResponseEntity<ApiResponse<List<String>>> getFollowedUserIds(
            @PathVariable UUID userId) {

        String cacheKey = "rec:follows:users:" + userId;
        List<String> result = fromCache(cacheKey, new TypeReference<>() {});

        if (result == null) {
            result = userFollowRepository.findFolloweeIdsByFollowerId(userId).stream()
                    .map(f -> f.getFolloweeId().toString())
                    .collect(Collectors.toList());
            toCache(cacheKey, result, TTL_FOLLOWS);
            log.debug("Cache MISS followed-users userId={} → {} users", userId, result.size());
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── Cache helpers ──────────────────────────────────────────────────────────

    private <T> T fromCache(String key, TypeReference<T> type) {
        try {
            Object raw = redisTemplate.opsForValue().get(key);
            if (raw != null) {
                return objectMapper.convertValue(raw, type);
            }
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
}

