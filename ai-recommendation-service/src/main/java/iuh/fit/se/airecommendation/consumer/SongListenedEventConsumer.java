package iuh.fit.se.airecommendation.consumer;

import iuh.fit.se.core.dto.message.SongListenEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class SongListenedEventConsumer {

    private final StringRedisTemplate redisTemplate;

    @RabbitListener(queues = "${app.rabbitmq.song-listen.queue:ai.recommendation.song-listen.queue}")
    public void consume(SongListenEvent event) {
        if (event.getUserId() == null || event.getSongId() == null) {
            return;
        }

        String profileKey = "ai:pref:user:" + event.getUserId();
        redisTemplate.opsForZSet().incrementScore(profileKey, event.getSongId().toString(), 1.0);
        redisTemplate.expire(profileKey, 90, TimeUnit.DAYS);

        log.info("AI profile updated user={} song={} duration={}", event.getUserId(), event.getSongId(), event.getDurationSeconds());
    }
}
