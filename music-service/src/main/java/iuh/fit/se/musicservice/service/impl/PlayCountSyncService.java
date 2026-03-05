package iuh.fit.se.musicservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Đếm lượt nghe trong Redis và flush định kỳ xuống PostgreSQL.
 * Tránh UPDATE song liên tục cho mỗi lượt play.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlayCountSyncService {

    private final StringRedisTemplate stringRedisTemplate;
    private final JdbcTemplate jdbcTemplate;

    private static final String KEY_PREFIX   = "song:play:";
    private static final String DIRTY_SET    = "song:play:dirty";

    private static final DefaultRedisScript<String> GET_AND_DELETE_SCRIPT;

    static {
        GET_AND_DELETE_SCRIPT = new DefaultRedisScript<>();
        GET_AND_DELETE_SCRIPT.setScriptText(
                "local v = redis.call('GET', KEYS[1]); " +
                        "if v then redis.call('DEL', KEYS[1]); return tostring(v); end; " +
                        "return '0';"
        );
        GET_AND_DELETE_SCRIPT.setResultType(String.class);
    }

    public void increment(UUID songId) {
        String key = KEY_PREFIX + songId;
        stringRedisTemplate.opsForValue().increment(key);
        stringRedisTemplate.opsForSet().add(DIRTY_SET, songId.toString());
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void flushToDatabase() {
        Set<String> dirtyIds = stringRedisTemplate.opsForSet().members(DIRTY_SET);
        if (dirtyIds == null || dirtyIds.isEmpty()) return;

        log.info("Flushing play count for {} songs from Redis to DB", dirtyIds.size());

        List<Object[]> batchArgs    = new ArrayList<>();
        List<String>   processedIds = new ArrayList<>();

        for (String idStr : dirtyIds) {
            try {
                UUID songId = UUID.fromString(idStr.replace("\"", ""));
                String raw  = stringRedisTemplate.execute(
                        GET_AND_DELETE_SCRIPT, List.of(KEY_PREFIX + songId));

                if (raw != null) {
                    long delta = Long.parseLong(raw);
                    if (delta > 0) batchArgs.add(new Object[]{delta, songId});
                }
                processedIds.add(idStr);
            } catch (Exception e) {
                log.error("Error processing play count for song {}", idStr, e);
            }
        }

        if (!batchArgs.isEmpty()) {
            jdbcTemplate.batchUpdate(
                    "UPDATE songs SET play_count = play_count + ? WHERE id = ?::uuid",
                    batchArgs
            );
            log.info("Flushed {} song play counts to DB", batchArgs.size());
        }

        if (!processedIds.isEmpty()) {
            stringRedisTemplate.opsForSet().remove(DIRTY_SET, processedIds.toArray());
        }
    }
}