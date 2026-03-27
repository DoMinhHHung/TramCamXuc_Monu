package iuh.fit.se.musicservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
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
    /** Song IDs with a pending Redis counter — no full-key SCAN on flush */
    private static final String DIRTY_SET = "song:playcount:dirty";

    /**
     * Atomic read-and-remove counter value in one EVAL (same guarantees as GETDEL on Redis 6.2+,
     * works on older Redis too).
     */
    private static final DefaultRedisScript<String> ATOMIC_GET_DEL = new DefaultRedisScript<>(
            "local v = redis.call('GET', KEYS[1]); if v ~= false then redis.call('DEL', KEYS[1]) end; return v",
            String.class
    );

    public void increment(UUID songId) {
        if (songId == null) {
            return;
        }
        String idStr = songId.toString();
        stringRedisTemplate.opsForValue().increment(KEY_PREFIX + idStr);
        stringRedisTemplate.opsForSet().add(DIRTY_SET, idStr);
    }

    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void flushToDatabase() {
        String drainKey = DIRTY_SET + ":drain:" + UUID.randomUUID();
        try {
            stringRedisTemplate.rename(DIRTY_SET, drainKey);
        } catch (DataAccessException ex) {
            // No dirty set (nothing to flush) or race with another instance that renamed first
            log.debug("Playcount flush skipped (no dirty set to rename): {}", ex.getMessage());
            return;
        }

        try {
            Set<String> dirtyIds = stringRedisTemplate.opsForSet().members(drainKey);
            if (dirtyIds == null || dirtyIds.isEmpty()) {
                return;
            }

            List<Object[]> batchArgs = new ArrayList<>();

            for (String songId : dirtyIds) {
                try {
                    String redisKey = KEY_PREFIX + songId;
                    String raw = stringRedisTemplate.execute(
                            ATOMIC_GET_DEL,
                            Collections.singletonList(redisKey));

                    if (raw == null || raw.isBlank()) {
                        continue;
                    }

                    long delta = Long.parseLong(raw.trim());
                    if (delta <= 0) {
                        continue;
                    }

                    batchArgs.add(new Object[]{delta, songId});
                } catch (Exception ex) {
                    log.warn("Skip invalid playcount songId={}", songId, ex);
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
        } finally {
            stringRedisTemplate.delete(drainKey);
        }
    }
}
