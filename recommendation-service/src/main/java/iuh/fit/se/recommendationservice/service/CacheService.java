package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.dto.RecommendationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${recommendation.cache.for-you-ttl-minutes:30}")
    private long forYouTtlMinutes;

    @Value("${recommendation.cache.similar-ttl-minutes:60}")
    private long similarTtlMinutes;

    @Value("${recommendation.cache.trending-ttl-minutes:5}")
    private long trendingTtlMinutes;

    @Value("${recommendation.cache.new-releases-ttl-minutes:15}")
    private long newReleasesTtlMinutes;

    // ── Key builders ─────────────────────────────────────────────

    public String forYouKey(String userId)       { return "rec:user:" + userId + ":for-you";       }
    public String genreMixKey(String userId)     { return "rec:user:" + userId + ":genre-mix";     }
    public String newReleasesKey(String userId)  { return "rec:user:" + userId + ":new-releases";  }
    public String similarKey(String songId)      { return "rec:song:" + songId + ":similar";       }
    public String trendingKey()                  { return "rec:trending";                           }

    // ── Get ──────────────────────────────────────────────────────

    public Optional<RecommendationResponse> get(String key) {
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value instanceof RecommendationResponse resp) {
                log.debug("Cache HIT: {}", key);
                return Optional.of(resp);
            }
        } catch (Exception e) {
            log.warn("Redis GET error for key {}: {}", key, e.getMessage());
        }
        return Optional.empty();
    }

    // ── Set ──────────────────────────────────────────────────────

    public void putForYou(String userId, RecommendationResponse response) {
        set(forYouKey(userId), response, Duration.ofMinutes(forYouTtlMinutes));
    }

    public void putGenreMix(String userId, RecommendationResponse response) {
        set(genreMixKey(userId), response, Duration.ofMinutes(forYouTtlMinutes));
    }

    public void putNewReleases(String userId, RecommendationResponse response) {
        set(newReleasesKey(userId), response, Duration.ofMinutes(newReleasesTtlMinutes));
    }

    public void putSimilar(String songId, RecommendationResponse response) {
        set(similarKey(songId), response, Duration.ofMinutes(similarTtlMinutes));
    }

    public void putTrending(RecommendationResponse response) {
        set(trendingKey(), response, Duration.ofMinutes(trendingTtlMinutes));
    }

    // ── Invalidate ───────────────────────────────────────────────

    /** Gọi khi có bài mới publish → trending & new-releases có thể stale */
    public void evictTrending() {
        delete(trendingKey());
    }

    /** Gọi khi user follow artist mới → new-releases stale */
    public void evictNewReleases(String userId) {
        delete(newReleasesKey(userId));
    }

    /** Gọi khi ML model retrain xong → for-you của tất cả user cần refresh
     *  Dùng scan pattern thay vì keys() để an toàn trên production Redis */
    public void evictAllForYou() {
        try {
            var keys = redisTemplate.keys("rec:user:*:for-you");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.info("Evicted {} for-you cache entries after ML retrain", keys.size());
            }
        } catch (Exception e) {
            log.warn("Failed to evict for-you caches: {}", e.getMessage());
        }
    }

    // ── Private ──────────────────────────────────────────────────

    private void set(String key, Object value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
            log.debug("Cache SET: {} (ttl={}min)", key, ttl.toMinutes());
        } catch (Exception e) {
            log.warn("Redis SET error for key {}: {}", key, e.getMessage());
            // Không throw — cache miss là acceptable
        }
    }

    private void delete(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Redis DELETE error for key {}: {}", key, e.getMessage());
        }
    }
}