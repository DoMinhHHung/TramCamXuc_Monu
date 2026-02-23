package iuh.fit.se.music.service.impl;

import iuh.fit.se.music.repository.SongRepository;
import iuh.fit.se.music.service.PlayCountSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayCountSyncServiceImpl implements PlayCountSyncService {
    private final RedisTemplate<String, Object> redisTemplate;
    private final SongRepository songRepository;

    private static final String PLAY_COUNT_KEY_PREFIX = "song:play:";
    private static final String PLAY_COUNT_DIRTY_SET = "song:play:dirty";

    @Override
    public void increment(UUID songId) {
        String key = PLAY_COUNT_KEY_PREFIX + songId;
        redisTemplate.opsForValue().increment(key);
        redisTemplate.opsForSet().add(PLAY_COUNT_DIRTY_SET, songId.toString());
    }

    @Override
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void flushToDatabase() {
        Set<Object> dirtyIds = redisTemplate.opsForSet().members(PLAY_COUNT_DIRTY_SET);
        if (dirtyIds == null || dirtyIds.isEmpty()) return;

        log.info("Flushing play counts for {} songs to DB", dirtyIds.size());

        for (Object idObj : dirtyIds) {
            try {
                UUID songId = UUID.fromString(idObj.toString());
                String key = PLAY_COUNT_KEY_PREFIX + songId;

                Object raw = redisTemplate.opsForValue().getAndDelete(key);
                if (raw == null) continue;

                long delta = Long.parseLong(raw.toString());
                if (delta <= 0) continue;

                songRepository.incrementPlayCount(songId, delta);
                redisTemplate.opsForSet().remove(PLAY_COUNT_DIRTY_SET, idObj);

            } catch (Exception e) {
                log.error("Failed to flush play count for songId={}", idObj, e);
            }
        }
    }
}
