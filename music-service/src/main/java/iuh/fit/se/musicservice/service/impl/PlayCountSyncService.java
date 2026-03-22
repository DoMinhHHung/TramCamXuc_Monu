package iuh.fit.se.musicservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayCountSyncService {

    private static final String KEY_PREFIX = "song:playcount:";
    private static final String DIRTY_SET_KEY = "song:playcount:dirty";

    private final StringRedisTemplate stringRedisTemplate;
    private final JdbcTemplate jdbcTemplate;

    public void increment(UUID songId) {
        if (songId == null) {
            return;
        }
        String key = KEY_PREFIX + songId;
        stringRedisTemplate.executePipelined((RedisCallback<Object>) connection -> {
            byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
            byte[] dirtyKey = DIRTY_SET_KEY.getBytes(StandardCharsets.UTF_8);
            byte[] songIdVal = songId.toString().getBytes(StandardCharsets.UTF_8);
            connection.stringCommands().incr(keyBytes);
            connection.setCommands().sAdd(dirtyKey, songIdVal);
            return null;
        });
    }

    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void flushToDatabase() {
        Set<String> dirtySongIds = stringRedisTemplate.opsForSet().members(DIRTY_SET_KEY);
        if (CollectionUtils.isEmpty(dirtySongIds)) {
            return;
        }
        stringRedisTemplate.delete(DIRTY_SET_KEY);

        List<Object[]> batchArgs = new ArrayList<>();
        List<String> keysToDelete = new ArrayList<>();
        for (String songId : dirtySongIds) {
            String key = KEY_PREFIX + songId;
            String raw = stringRedisTemplate.opsForValue().get(key);
            if (raw == null || raw.isBlank()) {
                continue;
            }
            try {
                long delta = Long.parseLong(raw.trim());
                if (delta <= 0) {
                    continue;
                }
                batchArgs.add(new Object[]{delta, songId});
                keysToDelete.add(key);
            } catch (NumberFormatException ex) {
                log.warn("Invalid playcount value for songId={}: {}", songId, raw);
                keysToDelete.add(key);
            }
        }
        if (batchArgs.isEmpty()) {
            return;
        }
        jdbcTemplate.batchUpdate("UPDATE songs SET play_count = play_count + ? WHERE id = ?::uuid", batchArgs);
        stringRedisTemplate.delete(keysToDelete);
        log.info("Flushed playcount for {} songs", batchArgs.size());
    }
}
