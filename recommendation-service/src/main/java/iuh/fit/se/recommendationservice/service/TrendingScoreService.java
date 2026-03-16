package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.RecommendedSongDto;
import iuh.fit.se.recommendationservice.dto.SongListenEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Quản lý trending score trong Redis Sorted Sets.
 *
 * ── Cấu trúc Redis ──────────────────────────────────────────────────────────
 *
 *   rec:trending:global           ZSET  (songId → score)
 *   rec:trending:genre:{genreId}  ZSET  (songId → score)
 *
 * ── Scoring logic ───────────────────────────────────────────────────────────
 *
 *   Mỗi lần nghe nhạc đóng góp một điểm cơ bản, được điều chỉnh bởi:
 *   - completion bonus: nghe xong toàn bài → bài hay hơn nghe 10s
 *   - duration weight: nghe lâu hơn → meaningful listen
 *
 *   Decay chạy hourly (TrendingDecayScheduler):
 *   score_new = score_old × decayFactor^hoursElapsed
 *   → bài cũ tự nhiên rơi xuống, bài mới viral nổi lên nhanh
 *
 * ── Tại sao ZSET thay vì sorted list thường? ────────────────────────────────
 *   ZINCRBY: O(log N) atomic increment — không race condition dù nhiều consumer
 *   ZREVRANGE: O(log N + M) để lấy top-M — nhanh dù ZSET có 10k entries
 *   ZREMRANGEBYRANK: xóa bottom entries để giữ kích thước ZSET ổn định
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrendingScoreService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisConfig.RecommendationProperties props;

    // ── Scoring weights ──────────────────────────────────────────────────────

    /** Điểm cơ bản cho mỗi lượt nghe */
    private static final double BASE_LISTEN_SCORE = 1.0;

    /** Bonus nếu nghe hoàn chỉnh (completed = true) */
    private static final double COMPLETION_BONUS = 4.0;

    /**
     * Duration weight: mỗi 30 giây nghe thêm được +1 điểm
     * (capped at 5 điểm = 2.5 phút)
     * → Tránh trường hợp bài 10 giây bị đánh giá ngang bài 5 phút
     */
    private static final int DURATION_UNIT_SECONDS = 30;
    private static final double MAX_DURATION_BONUS = 5.0;

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Cập nhật trending score khi có sự kiện nghe nhạc.
     * Gọi bởi TrendingEventConsumer từ RabbitMQ message.
     *
     * @param event deserialized từ song.listen.fanout.exchange message
     */
    public void handleListenEvent(SongListenEventDto event) {
        if (!StringUtils.hasText(event.getSongId())) {
            log.warn("[Trending] Received event with null songId, skipping");
            return;
        }

        double score = calculateListenScore(event);
        String songId = event.getSongId();

        // Update global trending
        incrementScore(RedisConfig.KEY_TRENDING_GLOBAL, songId, score);
        trimZSet(RedisConfig.KEY_TRENDING_GLOBAL, props.getTrending().getGlobalTopSize());

        // Update per-genre trending (nếu event có genre info)
        if (event.getGenreIds() != null && !event.getGenreIds().isEmpty()) {
            for (String genreId : event.getGenreIds()) {
                String genreKey = RedisConfig.KEY_TRENDING_GENRE + genreId;
                incrementScore(genreKey, songId, score);
                trimZSet(genreKey, props.getTrending().getGenreTopSize());
            }
        }

        log.debug("[Trending] Updated score for songId={} by +{:.2f} (completed={}, duration={}s)",
                songId, score, event.isCompleted(), event.getDurationSeconds());
    }

    /**
     * Lấy top-N trending songs global.
     *
     * @param topN số lượng cần lấy
     * @return list songId theo thứ tự score giảm dần
     */
    public List<String> getGlobalTrending(int topN) {
        return getTopSongIds(RedisConfig.KEY_TRENDING_GLOBAL, topN);
    }

    /**
     * Lấy top-N trending songs trong một genre.
     */
    public List<String> getTrendingByGenre(String genreId, int topN) {
        return getTopSongIds(RedisConfig.KEY_TRENDING_GENRE + genreId, topN);
    }

    /**
     * Lấy score của một bài hát trong trending global.
     * Dùng khi blending — để tính trending contribution.
     *
     * @return score, hoặc 0.0 nếu bài không có trong trending ZSET
     */
    public double getTrendingScore(String songId) {
        Double score = redisTemplate.opsForZSet()
                .score(RedisConfig.KEY_TRENDING_GLOBAL, songId);
        return score != null ? score : 0.0;
    }

    /**
     * Decay tất cả scores trong một ZSET.
     * Gọi bởi TrendingDecayScheduler mỗi giờ.
     *
     * Design: thay vì dùng TTL (làm mất hết data), chúng ta nhân score với
     * decay factor → bài cũ dần rơi xuống đáy ZSET → không ảnh hưởng top
     */
    public void decayAll(String zsetKey) {
        Set<ZSetOperations.TypedTuple<Object>> entries =
                redisTemplate.opsForZSet().rangeWithScores(zsetKey, 0, -1);

        if (entries == null || entries.isEmpty()) return;

        double factor = props.getTrending().getDecayFactor();
        int updated = 0;

        for (ZSetOperations.TypedTuple<Object> entry : entries) {
            if (entry.getValue() == null || entry.getScore() == null) continue;

            double newScore = entry.getScore() * factor;

            if (newScore < 0.01) {
                // Score quá nhỏ → remove để giữ ZSET sạch
                redisTemplate.opsForZSet().remove(zsetKey, entry.getValue());
            } else {
                redisTemplate.opsForZSet().add(zsetKey, entry.getValue(), newScore);
            }
            updated++;
        }

        log.debug("[Trending] Decayed {} entries in {} (factor={})", updated, zsetKey, factor);
    }

    /**
     * Lấy tất cả genre keys có trending data để decay.
     * Dùng bởi scheduler để lặp qua tất cả per-genre ZSETs.
     */
    public Set<String> getAllGenreTrendingKeys() {
        Set<String> keys = redisTemplate.keys(RedisConfig.KEY_TRENDING_GENRE + "*");
        return keys != null ? keys : Collections.emptySet();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Tính điểm đóng góp của một sự kiện nghe nhạc.
     *
     * Formula:
     *   score = BASE_LISTEN_SCORE
     *         + (completed ? COMPLETION_BONUS : 0)
     *         + min(durationSeconds / DURATION_UNIT_SECONDS, MAX_DURATION_BONUS)
     *
     * Ví dụ:
     *   Nghe 10s, không xong  → 1.0 + 0 + 0.33 = 1.33
     *   Nghe 60s, không xong  → 1.0 + 0 + 2.0  = 3.0
     *   Nghe 180s, xong bài   → 1.0 + 4.0 + 5.0 = 10.0 (max)
     */
    private double calculateListenScore(SongListenEventDto event) {
        double score = BASE_LISTEN_SCORE;

        if (event.isCompleted()) {
            score += COMPLETION_BONUS;
        }

        double durationBonus = Math.min(
                (double) event.getDurationSeconds() / DURATION_UNIT_SECONDS,
                MAX_DURATION_BONUS
        );
        score += durationBonus;

        return score;
    }

    private void incrementScore(String key, String songId, double delta) {
        redisTemplate.opsForZSet().incrementScore(key, songId, delta);
    }

    private List<String> getTopSongIds(String key, int topN) {
        Set<Object> result = redisTemplate.opsForZSet()
                .reverseRange(key, 0, topN - 1);

        if (result == null) return Collections.emptyList();

        return result.stream()
                .map(Object::toString)
                .collect(Collectors.toList());
    }

    /**
     * Giữ ZSET không vượt quá maxSize.
     * Remove các entries có score thấp nhất để tránh memory leak.
     */
    private void trimZSet(String key, int maxSize) {
        Long currentSize = redisTemplate.opsForZSet().size(key);
        if (currentSize != null && currentSize > maxSize) {
            // Xóa từ vị trí 0 đến (currentSize - maxSize - 1) — tức là bottom entries
            redisTemplate.opsForZSet().removeRange(key, 0, currentSize - maxSize - 1);
        }
    }
}