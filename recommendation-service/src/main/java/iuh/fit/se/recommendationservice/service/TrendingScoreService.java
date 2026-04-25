package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.EngagementEventDto;
import iuh.fit.se.recommendationservice.dto.SongListenEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import iuh.fit.se.recommendationservice.config.RedisConfig.RecommendationProperties;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Quản lý trending scores trong Redis Sorted Sets.
 *
 * ── Cấu trúc Redis ──────────────────────────────────────────────────────────
 *
 *   rec:trending:global           ZSET  songId → listen_score   (50% weight)
 *   rec:engagement:global         ZSET  songId → engagement_score (30% weight)
 *   rec:trending:genre:{genreId}  ZSET  songId → listen_score   (per-genre)
 *   rec:trending:velocity         HASH  songId → velocity_normalized [0,1] (15%)
 *   rec:trending:snap:{epochHour} HASH  songId → score  (24h snapshot cho velocity)
 *
 * ── Scoring ──────────────────────────────────────────────────────────────────
 *
 *   Listen score (per listen event):
 *     1.0 + (completed ? 4.0 : 0) + min(durationSeconds/30, 5.0)
 *     → Range [1.0, 10.0]
 *
 *   Engagement score (per social event):
 *     LIKE=+8, HEART=+6, COMMENT=+3, SHARE=+5
 *     DISLIKE=-10, UN_LIKE=-4, UN_HEART=-3, UN_DISLIKE=+5
 *
 *   Combined trending (tính tại read-time bởi Orchestrator):
 *     score = listen_raw×0.50 + engagement_raw×0.30 + velocity×0.15
 *     freshness_factor = 2.0|1.5|1.2|1.0 (applied as multiplier)
 *
 * ── Decay ────────────────────────────────────────────────────────────────────
 *   Mỗi giờ: score *= 0.85 → bài 24h cũ còn ~3%, tự rơi khỏi top
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrendingScoreService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RecommendationProperties props;

    // ── Redis key constants ──────────────────────────────────────────────────
    public static final String KEY_ENGAGEMENT_GLOBAL  = "rec:engagement:global";
    public static final String KEY_ENGAGEMENT_GENRE   = "rec:engagement:genre:";
    public static final String KEY_VELOCITY_HASH      = "rec:trending:velocity";
    public static final String KEY_SNAPSHOT_PREFIX    = "rec:trending:snap:";

    // ── Listen score weights ─────────────────────────────────────────────────
    private static final double BASE_LISTEN_SCORE   = 1.0;
    private static final double COMPLETION_BONUS    = 4.0;
    private static final int    DURATION_UNIT_SECS  = 30;
    private static final double MAX_DURATION_BONUS  = 5.0;

    // ── Engagement score weights ─────────────────────────────────────────────
    private static final double SCORE_LIKE        =  8.0;
    private static final double SCORE_HEART       =  6.0;
    private static final double SCORE_COMMENT     =  3.0;
    private static final double SCORE_SHARE       =  5.0;
    private static final double SCORE_DISLIKE     = -10.0;
    private static final double SCORE_UN_LIKE     = -4.0;
    private static final double SCORE_UN_HEART    = -3.0;
    private static final double SCORE_UN_DISLIKE  =  5.0;
    /** Feature 3: Negative signal mạnh — bỏ qua trong 10 giây đầu */
    private static final double SCORE_SKIP_EARLY  = -3.0;
    /** Feature 3: Super like — nghe lại ngay lập tức */
    private static final double SCORE_REPEAT      = 12.0;

    // ── Public API: Write path ────────────────────────────────────────────────

    public void handleListenEvent(SongListenEventDto event) {
        if (!StringUtils.hasText(event.getSongId())) {
            log.warn("[Trending] Received event with null songId, skipping");
            return;
        }

        double score  = calculateListenScore(event);
        String songId = event.getSongId();

        incrementScore(RedisConfig.KEY_TRENDING_GLOBAL, songId, score);
        trimZSet(RedisConfig.KEY_TRENDING_GLOBAL, props.getTrending().getGlobalTopSize());

        if (event.getGenreIds() != null && !event.getGenreIds().isEmpty()) {
            for (String genreId : event.getGenreIds()) {
                String genreKey = RedisConfig.KEY_TRENDING_GENRE + genreId;
                incrementScore(genreKey, songId, score);
                trimZSet(genreKey, props.getTrending().getGenreTopSize());
            }
        }

        log.debug("[Trending] Listen +{:.2f} for songId={} (completed={}, duration={}s)",
                score, songId, event.isCompleted(), event.getDurationSeconds());
    }

    public void handleEngagementEvent(EngagementEventDto event) {
        if (!StringUtils.hasText(event.getSongId()) || !StringUtils.hasText(event.getType())) return;

        double delta = engagementDelta(event.getType());
        if (delta == 0.0) return;

        String songId = event.getSongId();

        incrementScore(KEY_ENGAGEMENT_GLOBAL, songId, delta);
        // Ensure engagement ZSET doesn't go below 0 for any song
        Double current = redisTemplate.opsForZSet().score(KEY_ENGAGEMENT_GLOBAL, songId);
        if (current != null && current < 0) {
            redisTemplate.opsForZSet().add(KEY_ENGAGEMENT_GLOBAL, songId, 0.0);
        }
        trimZSet(KEY_ENGAGEMENT_GLOBAL, props.getTrending().getGlobalTopSize());

        log.debug("[Engagement] {} {:+.1f} for songId={}", event.getType(), delta, songId);
    }

    // ── Public API: Read path ─────────────────────────────────────────────────

    public List<String> getGlobalTrending(int topN) {
        return getTopSongIds(RedisConfig.KEY_TRENDING_GLOBAL, topN);
    }

    public List<String> getTrendingByGenre(String genreId, int topN) {
        return getTopSongIds(RedisConfig.KEY_TRENDING_GENRE + genreId, topN);
    }

    public double getTrendingScore(String songId) {
        Double score = redisTemplate.opsForZSet()
                .score(RedisConfig.KEY_TRENDING_GLOBAL, songId);
        return score != null ? score : 0.0;
    }

    public double getEngagementScore(String songId) {
        Double score = redisTemplate.opsForZSet().score(KEY_ENGAGEMENT_GLOBAL, songId);
        return score != null ? score : 0.0;
    }

    /** Velocity [0,1] từ Redis HASH, default 0.5 (neutral sigmoid) nếu chưa tính */
    public double getVelocityScore(String songId) {
        Object raw = redisTemplate.opsForHash().get(KEY_VELOCITY_HASH, songId);
        if (raw == null) return 0.5;
        try { return Double.parseDouble(raw.toString()); } catch (Exception e) { return 0.5; }
    }

    /** Batch get velocity scores cho nhiều songs — dùng pipeline để giảm round-trips */
    public Map<String, Double> getVelocityScoresBatch(List<String> songIds) {
        if (songIds == null || songIds.isEmpty()) return Collections.emptyMap();
        List<Object> values = redisTemplate.opsForHash().multiGet(KEY_VELOCITY_HASH, new ArrayList<>(songIds));
        Map<String, Double> result = new LinkedHashMap<>();
        for (int i = 0; i < songIds.size(); i++) {
            Object raw = values.get(i);
            double v = 0.5;
            if (raw != null) {
                try { v = Double.parseDouble(raw.toString()); } catch (Exception ignored) {}
            }
            result.put(songIds.get(i), v);
        }
        return result;
    }

    /** Batch get engagement scores từ ZSET */
    public Map<String, Double> getEngagementScoresBatch(List<String> songIds) {
        if (songIds == null || songIds.isEmpty()) return Collections.emptyMap();
        Map<String, Double> result = new LinkedHashMap<>();
        for (String songId : songIds) {
            result.put(songId, getEngagementScore(songId));
        }
        return result;
    }

    // ── Decay ─────────────────────────────────────────────────────────────────

    public void decayAll(String zsetKey) {
        Set<ZSetOperations.TypedTuple<Object>> entries =
                redisTemplate.opsForZSet().rangeWithScores(zsetKey, 0, -1);

        if (entries == null || entries.isEmpty()) return;

        double factor = props.getTrending().getDecayFactor();
        byte[] rawKey = serializeKey(zsetKey);
        int[] updated = {0};

        redisTemplate.executePipelined((RedisCallback<Object>) connection -> {
            for (ZSetOperations.TypedTuple<Object> entry : entries) {
                if (entry.getValue() == null || entry.getScore() == null) continue;

                byte[] rawMember = serializeMember(entry.getValue());
                if (rawMember == null) continue;

                double newScore = entry.getScore() * factor;

                if (newScore < 0.01) {
                    connection.zSetCommands().zRem(rawKey, rawMember);
                } else {
                    connection.zSetCommands().zAdd(rawKey, newScore, rawMember);
                }
                updated[0]++;
            }
            return null;
        });

        log.debug("[Trending] Decayed {} entries in {} (factor={})", updated[0], zsetKey, factor);
    }

    public Set<String> getAllGenreTrendingKeys() {
        Set<String> keys = redisTemplate.keys(RedisConfig.KEY_TRENDING_GENRE + "*");
        return keys != null ? keys : Collections.emptySet();
    }

    // ── Velocity snapshot ─────────────────────────────────────────────────────

    /**
     * Snapshot toàn bộ trending ZSET vào một Redis HASH theo epochHour.
     * Dùng bởi TrendingDecayScheduler mỗi giờ để tính velocity.
     * TTL 48h để có thể so sánh với 24h trước.
     */
    public void snapshotCurrentScores(long epochHour) {
        Set<ZSetOperations.TypedTuple<Object>> entries =
                redisTemplate.opsForZSet().rangeWithScores(RedisConfig.KEY_TRENDING_GLOBAL, 0, -1);

        if (entries == null || entries.isEmpty()) return;

        String snapKey = KEY_SNAPSHOT_PREFIX + epochHour;
        Map<String, Double> snapshot = new LinkedHashMap<>();
        for (ZSetOperations.TypedTuple<Object> e : entries) {
            if (e.getValue() != null && e.getScore() != null) {
                snapshot.put(e.getValue().toString(), e.getScore());
            }
        }

        redisTemplate.opsForHash().putAll(snapKey, snapshot);
        redisTemplate.expire(snapKey, Duration.ofHours(48));

        log.debug("[Velocity] Snapshot {} songs → key={}", snapshot.size(), snapKey);
    }

    /**
     * Tính velocity cho từng bài và lưu vào KEY_VELOCITY_HASH.
     * velocity = sigmoid((current - yesterday) / max(yesterday, 1))
     */
    public void recomputeVelocityScores(long epochHour) {
        long yesterdayEpochHour = epochHour - 24;
        String yesterdayKey = KEY_SNAPSHOT_PREFIX + yesterdayEpochHour;

        Set<ZSetOperations.TypedTuple<Object>> currentEntries =
                redisTemplate.opsForZSet().rangeWithScores(RedisConfig.KEY_TRENDING_GLOBAL, 0, -1);

        if (currentEntries == null || currentEntries.isEmpty()) return;

        Map<String, Double> velocities = new LinkedHashMap<>();
        for (ZSetOperations.TypedTuple<Object> entry : currentEntries) {
            if (entry.getValue() == null || entry.getScore() == null) continue;
            String songId = entry.getValue().toString();
            double current = entry.getScore();

            Object rawYesterday = redisTemplate.opsForHash().get(yesterdayKey, songId);
            double yesterday = 0.0;
            if (rawYesterday != null) {
                try { yesterday = Double.parseDouble(rawYesterday.toString()); } catch (Exception ignored) {}
            }

            double rawVelocity = (current - yesterday) / Math.max(yesterday, 1.0);
            double normalized  = sigmoid(rawVelocity);
            velocities.put(songId, normalized);
        }

        if (!velocities.isEmpty()) {
            redisTemplate.opsForHash().putAll(KEY_VELOCITY_HASH, velocities);
        }
        log.debug("[Velocity] Recomputed {} velocity scores (epochHour={})", velocities.size(), epochHour);
    }

    // ── Freshness (applied at read-time in Orchestrator) ──────────────────────

    /**
     * Tính freshness multiplier dựa trên age của bài hát (tính bằng giờ).
     *   < 24h  → 2.0  (double boost)
     *   1-3d   → 1.5
     *   3-7d   → 1.2
     *   > 7d   → 1.0  (no bonus)
     */
    public static double freshnessMultiplier(String createdAtIso) {
        if (createdAtIso == null || createdAtIso.isBlank()) return 1.0;
        try {
            java.time.Instant created = java.time.Instant.parse(createdAtIso);
            long ageHours = java.time.Duration.between(created, java.time.Instant.now()).toHours();
            if (ageHours <= 24)  return 2.0;
            if (ageHours <= 72)  return 1.5;
            if (ageHours <= 168) return 1.2;
            return 1.0;
        } catch (Exception e) {
            return 1.0;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    public double calculateListenScore(SongListenEventDto event) {
        double score = BASE_LISTEN_SCORE;
        if (event.isCompleted()) score += COMPLETION_BONUS;
        score += Math.min((double) event.getDurationSeconds() / DURATION_UNIT_SECS, MAX_DURATION_BONUS);
        return score;
    }

    private double engagementDelta(String type) {
        return switch (type.toUpperCase()) {
            case "LIKE"       -> SCORE_LIKE;
            case "UN_LIKE"    -> SCORE_UN_LIKE;
            case "DISLIKE"    -> SCORE_DISLIKE;
            case "UN_DISLIKE" -> SCORE_UN_DISLIKE;
            case "HEART"      -> SCORE_HEART;
            case "UN_HEART"   -> SCORE_UN_HEART;
            case "COMMENT"    -> SCORE_COMMENT;
            case "SHARE"      -> SCORE_SHARE;
            case "SKIP_EARLY" -> SCORE_SKIP_EARLY;
            case "REPEAT"     -> SCORE_REPEAT;
            default           -> 0.0;
        };
    }

    private double sigmoid(double x) {
        return 1.0 / (1.0 + Math.exp(-x));
    }

    private void incrementScore(String key, String songId, double delta) {
        redisTemplate.opsForZSet().incrementScore(key, songId, delta);
    }

    private List<String> getTopSongIds(String key, int topN) {
        Set<Object> result = redisTemplate.opsForZSet().reverseRange(key, 0, topN - 1);
        if (result == null) return Collections.emptyList();
        return result.stream().map(Object::toString).collect(Collectors.toList());
    }

    private void trimZSet(String key, int maxSize) {
        Long size = redisTemplate.opsForZSet().size(key);
        if (size != null && size > maxSize) {
            redisTemplate.opsForZSet().removeRange(key, 0, size - maxSize - 1);
        }
    }

    private byte[] serializeKey(String key) {
        return redisTemplate.getStringSerializer().serialize(key);
    }

    @SuppressWarnings("unchecked")
    private byte[] serializeMember(Object member) {
        RedisSerializer<Object> serializer = (RedisSerializer<Object>) redisTemplate.getValueSerializer();
        return serializer != null ? serializer.serialize(member) : null;
    }
}
