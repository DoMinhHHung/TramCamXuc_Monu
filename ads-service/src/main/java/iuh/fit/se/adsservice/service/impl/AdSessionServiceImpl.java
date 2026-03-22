package iuh.fit.se.adsservice.service.impl;

import iuh.fit.se.adsservice.config.AdsProperties;
import iuh.fit.se.adsservice.service.AdSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdSessionServiceImpl implements AdSessionService {

    private static final String SONG_COUNT_FIELD = "songCount";
    private static final String LISTENED_SECONDS_FIELD = "listenedSeconds";

    private final RedisTemplate<String, Object> redisTemplate;
    private final AdsProperties props;

    @Override
    public boolean onSongListened(UUID userId, int durationSeconds) {
        String key = sessionKey(userId);
        redisTemplate.opsForHash().putIfAbsent(key, SONG_COUNT_FIELD, 0L);
        redisTemplate.opsForHash().putIfAbsent(key, LISTENED_SECONDS_FIELD, 0L);

        Long newCount = redisTemplate.opsForHash().increment(key, SONG_COUNT_FIELD, 1);
        long addedSeconds = Math.max(durationSeconds, 0);
        Long newListened = redisTemplate.opsForHash().increment(key, LISTENED_SECONDS_FIELD, addedSeconds);

        Duration ttl = Duration.ofHours(props.getSession().getSessionTtlHours());
        redisTemplate.expire(key, ttl);

        log.debug("User {} onSongListened: songCount={}, listenedSeconds={}, addedSec={}",
                userId, newCount, newListened, addedSeconds);

        return newCount >= props.getSession().getMaxSongsBeforeAd()
                || newListened >= props.getSession().getMaxListenedSeconds();
    }

    @Override
    public boolean isAdDue(UUID userId) {
        String key = sessionKey(userId);
        Object rawCount = redisTemplate.opsForHash().get(key, SONG_COUNT_FIELD);
        Object rawListened = redisTemplate.opsForHash().get(key, LISTENED_SECONDS_FIELD);
        if (rawCount == null && rawListened == null) return false;

        long songCount = rawCount != null ? toLong(rawCount) : 0L;
        long listenedSeconds = rawListened != null ? toLong(rawListened) : 0L;
        boolean due = songCount >= props.getSession().getMaxSongsBeforeAd()
                || listenedSeconds >= props.getSession().getMaxListenedSeconds();
        log.debug("User {} isAdDue={} (songs={}, listenedSec={})", userId, due, songCount, listenedSeconds);
        return due;
    }

    @Override
    public void resetSession(UUID userId) {
        redisTemplate.delete(sessionKey(userId));
        log.debug("Ad session reset for user {}", userId);
    }

    private String sessionKey(UUID userId) {
        return "ads:session:" + userId;
    }

    private long toLong(Object val) {
        if (val instanceof Long l) return l;
        if (val instanceof Integer i) return i.longValue();
        return Long.parseLong(val.toString());
    }
}
