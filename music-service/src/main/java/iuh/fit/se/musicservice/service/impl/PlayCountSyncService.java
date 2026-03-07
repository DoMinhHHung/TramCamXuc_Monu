package iuh.fit.se.musicservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Write-behind play count sync:
 * - Hot path increments Redis counters only (O(1))
 * - Scheduled batch job flushes aggregated deltas to PostgreSQL.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlayCountSyncService {

    private final StringRedisTemplate stringRedisTemplate;
    private final JdbcTemplate jdbcTemplate;

    private static final String KEY_PREFIX = "song:playcount:";

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
        if (songId == null) {
            return;
        }
        stringRedisTemplate.opsForValue().increment(KEY_PREFIX + songId);
    }

    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void flushToDatabase() {
        Set<String> keys = scanPlayCountKeys();
        if (keys.isEmpty()) {
            return;
        }

        List<Object[]> batchArgs = new ArrayList<>();

        for (String key : keys) {
            try {
                String raw = stringRedisTemplate.execute(GET_AND_DELETE_SCRIPT, List.of(key));
                if (raw == null || raw.isBlank()) {
                    continue;
                }

                long delta = Long.parseLong(raw);
                if (delta <= 0) {
                    continue;
                }

                String songId = key.substring(KEY_PREFIX.length());
                batchArgs.add(new Object[]{delta, songId});
            } catch (Exception ex) {
                log.warn("Skip invalid playcount key={}", key, ex);
            }
        }

        if (batchArgs.isEmpty()) {
            return;
        }

        jdbcTemplate.batchUpdate(
                "UPDATE songs SET play_count = play_count + ? WHERE id = ?::uuid",
                batchArgs
        );

        log.info("Flushed playcount deltas for {} songs", batchArgs.size());
    }

    private Set<String> scanPlayCountKeys() {
        return stringRedisTemplate.execute((RedisConnection connection) -> {
            ScanOptions options = ScanOptions.scanOptions()
                    .match(KEY_PREFIX + "*")
                    .count(1000)
                    .build();

            try (Cursor<byte[]> cursor = connection.scan(options)) {
                Set<String> keys = new java.util.HashSet<>();
                while (cursor.hasNext()) {
                    keys.add(new String(cursor.next(), StandardCharsets.UTF_8));
                }
                return keys;
            } catch (Exception e) {
                log.error("Failed to scan playcount keys from Redis", e);
                return Set.<String>of();
            }
        });
    }
}
