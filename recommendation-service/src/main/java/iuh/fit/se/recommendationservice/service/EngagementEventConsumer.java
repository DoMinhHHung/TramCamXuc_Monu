package iuh.fit.se.recommendationservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.recommendationservice.config.RabbitMQConfig;
import iuh.fit.se.recommendationservice.dto.EngagementEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;

/**
 * Nhận engagement events từ social-service (like, dislike, heart, comment, share).
 * Cập nhật engagement trending score trong Redis ZSET rec:engagement:global.
 *
 * Điểm engagement (per event):
 *   LIKE     = +8.0   (strong positive signal)
 *   HEART    = +6.0   (favorite — slightly less viral than like)
 *   COMMENT  = +3.0   (shows interest, lower engagement cost)
 *   SHARE    = +5.0   (high-value action: expands reach)
 *   DISLIKE  = -10.0  (heavy penalty — user actively dislikes)
 *   UN_LIKE  = -4.0   (removed like — moderate negative)
 *   UN_HEART = -3.0   (removed heart)
 *   UN_DISLIKE = +5.0 (removed dislike — partial recovery)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EngagementEventConsumer {

    private final TrendingScoreService trendingScoreService;

    @RabbitListener(queues = RabbitMQConfig.REC_ENGAGEMENT_QUEUE, ackMode = "MANUAL")
    public void handleEngagementEvent(
            EngagementEventDto event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        try {
            if (event == null || !StringUtils.hasText(event.getSongId())
                    || !StringUtils.hasText(event.getType())) {
                log.warn("[Engagement] Received incomplete event, skipping");
                channel.basicAck(deliveryTag, false);
                return;
            }

            trendingScoreService.handleEngagementEvent(event);
            channel.basicAck(deliveryTag, false);

        } catch (Exception e) {
            log.error("[Engagement] Failed to process event songId={}: {}",
                    event != null ? event.getSongId() : "null", e.getMessage(), e);
            try {
                channel.basicNack(deliveryTag, false, false);
            } catch (IOException ioEx) {
                log.error("[Engagement] NACK failed: {}", ioEx.getMessage());
            }
        }
    }
}
