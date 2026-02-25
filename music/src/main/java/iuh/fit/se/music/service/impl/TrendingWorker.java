package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.dto.message.SongListenEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.WeekFields;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrendingWorker {

    private final StringRedisTemplate redisTemplate;

    private static final long WEEK_TTL_DAYS  = 56;
    private static final long MONTH_TTL_DAYS = 395;
    private static final long YEAR_TTL_DAYS  = 730;

    @RabbitListener(queues = "listen.trending.queue")
    public void handle(SongListenEvent event) {
        try {
            if (event.getDurationSeconds() < 30) return;

            LocalDate date = event.getListenedAt()
                    .atZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDate();

            String weekKey  = weekKey(date);
            String monthKey = monthKey(date);
            String yearKey  = String.valueOf(date.getYear());

            String songId = event.getSongId().toString();

            incrementAndExpire("trending:song:week:"  + weekKey,  songId, WEEK_TTL_DAYS);
            incrementAndExpire("trending:song:month:" + monthKey, songId, MONTH_TTL_DAYS);
            incrementAndExpire("trending:song:year:"  + yearKey,  songId, YEAR_TTL_DAYS);

            if (event.getAlbumId() != null) {
                String albumId = event.getAlbumId().toString();
                incrementAndExpire("trending:album:month:" + monthKey, albumId, MONTH_TTL_DAYS);
                incrementAndExpire("trending:album:year:"  + yearKey,  albumId, YEAR_TTL_DAYS);
            }

            if (event.getArtistId() != null) {
                String artistId = event.getArtistId().toString();
                incrementAndExpire("trending:artist:month:" + monthKey, artistId, MONTH_TTL_DAYS);
                incrementAndExpire("trending:artist:year:"  + yearKey,  artistId, YEAR_TTL_DAYS);
            }

            log.debug("Trending updated: song={} artist={}", event.getSongId(), event.getArtistId());

        } catch (Exception e) {
            log.error("Failed to update trending for song={}", event.getSongId(), e);
            throw e;
        }
    }
    private void incrementAndExpire(String key, String member, long ttlDays) {
        redisTemplate.opsForZSet().incrementScore(key, member, 1.0);
        if (redisTemplate.getExpire(key) == -1L) {
            redisTemplate.expire(key, ttlDays, TimeUnit.DAYS);
        }
    }

    private String weekKey(LocalDate date) {
        int week = date.get(WeekFields.ISO.weekOfWeekBasedYear());
        return date.getYear() + "-W" + String.format("%02d", week);
    }

    private String monthKey(LocalDate date) {
        return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
    }
}