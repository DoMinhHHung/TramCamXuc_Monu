package iuh.fit.se.recommendationservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.recommendationservice.config.RabbitMQConfig;
import iuh.fit.se.recommendationservice.dto.SongListenEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

/**
 * Nhận sự kiện nghe nhạc từ music-service.
 *
 * Hai việc:
 *   1. Cập nhật trending score (TrendingScoreService)
 *   2. Track active users vào Redis SET "ml:active-users"
 *      → Python ML pipeline đọc SET này để biết user nào cần pull data
 *
 * music-service publish Map<String, Object>, Spring AMQP với
 * Jackson2JsonMessageConverter tự deserialize sang SongListenEventDto.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrendingEventConsumer {

    private final TrendingScoreService trendingScoreService;
    private final StringRedisTemplate  stringRedisTemplate;

    private static final String   ACTIVE_USERS_KEY = "ml:active-users";
    private static final Duration ACTIVE_USERS_TTL = Duration.ofDays(7);

    @RabbitListener(queues = RabbitMQConfig.REC_TRENDING_QUEUE, ackMode = "MANUAL")
    public void handleListenEvent(
            SongListenEventDto event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        try {
            // ── 1. Cập nhật trending score ─────────────────────────────
            trendingScoreService.handleListenEvent(event);

            // ── 2. Track userId cho Python ML pipeline ─────────────────
            if (event != null && event.getUserId() != null
                    && !event.getUserId().isBlank()) {
                try {
                    stringRedisTemplate.opsForSet()
                            .add(ACTIVE_USERS_KEY, event.getUserId());
                    stringRedisTemplate.expire(ACTIVE_USERS_KEY, ACTIVE_USERS_TTL);
                } catch (Exception e) {
                    // Best-effort, không fail main flow
                    log.trace("[ML] Failed to track user {}: {}",
                            event.getUserId(), e.getMessage());
                }
            }

            channel.basicAck(deliveryTag, false);

        } catch (Exception e) {
            log.error("[Trending] Failed to process event songId={}: {}",
                    event != null ? event.getSongId() : "null", e.getMessage(), e);
            try {
                channel.basicNack(deliveryTag, false, false);
            } catch (IOException ioEx) {
                log.error("[Trending] NACK failed: {}", ioEx.getMessage());
            }
        }
    }
}