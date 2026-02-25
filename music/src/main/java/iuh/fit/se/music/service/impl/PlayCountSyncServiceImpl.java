package iuh.fit.se.music.service.impl;

import iuh.fit.se.music.service.PlayCountSyncService;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayCountSyncServiceImpl implements PlayCountSyncService {

    private final StringRedisTemplate stringRedisTemplate;

    private final JdbcTemplate jdbcTemplate;

    private static final String PLAY_COUNT_KEY_PREFIX = "song:play:";
    private static final String PLAY_COUNT_DIRTY_SET  = "song:play:dirty";

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

    @Override
    public void increment(UUID songId) {
        String key = PLAY_COUNT_KEY_PREFIX + songId;
        stringRedisTemplate.opsForValue().increment(key);
        stringRedisTemplate.opsForSet().add(PLAY_COUNT_DIRTY_SET, songId.toString());
    }

    @Override
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void flushToDatabase() {
        Set<String> dirtyIds = stringRedisTemplate.opsForSet().members(PLAY_COUNT_DIRTY_SET);
        if (dirtyIds == null || dirtyIds.isEmpty()) return;

        log.info("Bắt đầu đồng bộ lượt nghe cho {} bài hát từ Redis xuống DB", dirtyIds.size());

        List<Object[]> batchArgs = new ArrayList<>();
        List<String> processedIds = new ArrayList<>();

        for (String idStr : dirtyIds) {
            try {
                UUID songId = UUID.fromString(idStr);
                String key  = PLAY_COUNT_KEY_PREFIX + songId;

                String rawDelta = stringRedisTemplate.execute(
                        GET_AND_DELETE_SCRIPT,
                        List.of(key)
                );

                if (rawDelta != null) {
                    long delta = Long.parseLong(rawDelta);
                    if (delta > 0) {
                        batchArgs.add(new Object[]{delta, songId});
                    }
                }
                processedIds.add(idStr);

            } catch (Exception e) {
                log.error("Lỗi lúc parse lượt nghe cho bài hát ID={}", idStr, e);
            }
        }

        if (!batchArgs.isEmpty()) {
            try {
                jdbcTemplate.batchUpdate(
                        "UPDATE songs SET play_count = play_count + ? WHERE id = ?",
                        batchArgs
                );
                log.info("Đã flush thành công {} record bài hát xuống DB", batchArgs.size());
            } catch (Exception e) {
                log.error("Toang lúc batch update xuống Database", e);
                throw e;
            }
        }

        if (!processedIds.isEmpty()) {
            stringRedisTemplate.opsForSet().remove(PLAY_COUNT_DIRTY_SET, processedIds.toArray());
        }
    }
}