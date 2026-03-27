package iuh.fit.se.adsservice.service.impl;

import iuh.fit.se.adsservice.service.AdSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Triển khai AdSessionService dùng Redis Hash.
 *
 * Cấu trúc key: ads:session:{userId}
 * Fields:
 *   songCount       – số bài đã nghe từ lần reset cuối
 *   listenedSeconds – tổng giây nghe thực tế (chỉ cộng khi có music đang phát)
 *
 * Logic kích hoạt ad:
 *   songCount >= 5   → ad
 *   listenedSeconds >= 1800 (30 phút)  → ad
 *
 * Tại sao dùng listenedSeconds thay vì wall-clock?
 *   Nếu user nghe 1 bài rồi tắt app 29 phút thì idle time không được tính.
 *   listenedSeconds chỉ tăng khi server nhận được SongListenEvent,
 *   tức là khi music thực sự đang phát trên client.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdSessionServiceImpl implements AdSessionService {

    private static final int    MAX_SONGS_BEFORE_AD    = 5;
    private static final long   MAX_LISTENED_SECONDS   = 30L * 60;

    private static final String SONG_COUNT_FIELD       = "songCount";
    private static final String LISTENED_SECONDS_FIELD = "listenedSeconds";

    /** TTL session: reset nếu không hoạt động 2 giờ */
    private static final Duration SESSION_TTL = Duration.ofHours(2);

    private final RedisTemplate<String, Object> redisTemplate;

    // ── public ───────────────────────────────────────────────────────────────

    @Override
    public boolean onSongListened(UUID userId, int durationSeconds) {
        String key = sessionKey(userId);
        long addedSeconds = Math.max(durationSeconds, 0);

        // Một pipeline = một round-trip TCP (HINCRBY ×2 + EXPIRE vẫn atomic từng lệnh trên server)
        byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
        byte[] songField = SONG_COUNT_FIELD.getBytes(StandardCharsets.UTF_8);
        byte[] listenedField = LISTENED_SECONDS_FIELD.getBytes(StandardCharsets.UTF_8);

        List<Object> results = redisTemplate.executePipelined((RedisCallback<Object>) conn -> {
            conn.hIncrBy(keyBytes, songField, 1);
            conn.hIncrBy(keyBytes, listenedField, addedSeconds);
            conn.expire(keyBytes, SESSION_TTL.getSeconds());
            return null;
        });

        long newCount = ((Number) results.get(0)).longValue();
        long newListened = ((Number) results.get(1)).longValue();

        log.debug("User {} onSongListened: songCount={}, listenedSeconds={}, addedSec={}",
                userId, newCount, newListened, addedSeconds);

        return newCount >= MAX_SONGS_BEFORE_AD || newListened >= MAX_LISTENED_SECONDS;
    }

    @Override
    public boolean isAdDue(UUID userId) {
        String key = sessionKey(userId);

        Object rawCount    = redisTemplate.opsForHash().get(key, SONG_COUNT_FIELD);
        Object rawListened = redisTemplate.opsForHash().get(key, LISTENED_SECONDS_FIELD);

        if (rawCount == null && rawListened == null) return false;

        long songCount      = rawCount    != null ? toLong(rawCount)    : 0L;
        long listenedSeconds = rawListened != null ? toLong(rawListened) : 0L;

        boolean due = songCount >= MAX_SONGS_BEFORE_AD || listenedSeconds >= MAX_LISTENED_SECONDS;
        log.debug("User {} isAdDue={} (songs={}, listenedSec={})", userId, due, songCount, listenedSeconds);
        return due;
    }

    @Override
    public void resetSession(UUID userId) {
        redisTemplate.delete(sessionKey(userId));
        log.debug("Ad session reset for user {}", userId);
    }

    // ── private ──────────────────────────────────────────────────────────────

    private String sessionKey(UUID userId) {
        return "ads:session:" + userId;
    }

    private long toLong(Object val) {
        if (val instanceof Long l)    return l;
        if (val instanceof Integer i) return i.longValue();
        return Long.parseLong(val.toString());
    }
}
