package iuh.fit.se.musicservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.Cursor;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayCountSyncService {

    private final StringRedisTemplate stringRedisTemplate;
    private final JdbcTemplate jdbcTemplate;

    private static final String KEY_PREFIX = "song:playcount:";

    public void increment(UUID songId) {
        if (songId == null) {
            return;
        }
        stringRedisTemplate.opsForValue().increment(KEY_PREFIX + songId);
    }

    /**
     * Flush Redis play-count deltas to the DB every 5 minutes.
     *
     * <p>Strategy: <b>read first, delete after commit</b>.
     * The old approach used an atomic Lua GET+DEL, which meant that if
     * {@code batchUpdate} threw an exception the delta was already gone from
     * Redis and would be lost forever.  Now we:
     * <ol>
     *   <li>GET (non-destructive) each key into {@code batchArgs}.</li>
     *   <li>Write all deltas to the DB in a single {@code batchUpdate}.</li>
     *   <li>Delete the Redis keys <em>only after the DB commit succeeds</em>.</li>
     * </ol>
     * If the DB write fails the keys survive in Redis and will be retried on
     * the next scheduled run (counts accumulate, so no double-counting occurs).
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void flushToDatabase() {
        Set<String> keys = scanPlayCountKeys();
        if (keys.isEmpty()) {
            return;
        }

        List<Object[]> batchArgs   = new ArrayList<>();
        List<String>   keysToDelete = new ArrayList<>();

        for (String key : keys) {
            try {
                String raw = stringRedisTemplate.opsForValue().get(key);
                if (raw == null || raw.isBlank()) {
                    continue;
                }

                long delta = Long.parseLong(raw.trim());
                if (delta <= 0) {
                    continue;
                }

                String songId = key.substring(KEY_PREFIX.length());
                batchArgs.add(new Object[]{delta, songId});
                keysToDelete.add(key);
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

         stringRedisTemplate.delete(keysToDelete);

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
