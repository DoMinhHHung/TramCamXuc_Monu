package iuh.fit.se.socialservice.event;

import iuh.fit.se.socialservice.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Publishes engagement events (like, dislike, heart, comment, share) to
 * social.engagement.fanout.exchange so recommendation-service can update
 * trending scores in real-time.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EngagementEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public enum EngagementType {
        LIKE, UN_LIKE, DISLIKE, UN_DISLIKE, HEART, UN_HEART, COMMENT, SHARE,
        /** Feature 3: Bỏ qua trong 10 giây đầu — negative signal mạnh */
        SKIP_EARLY,
        /** Feature 3: Nghe lại ngay lập tức — super like */
        REPEAT
    }

    public void publish(UUID songId, UUID userId, EngagementType type) {
        publish(songId, userId, type, null);
    }

    public void publish(UUID songId, UUID userId, EngagementType type, UUID artistId) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("songId",   songId != null   ? songId.toString()   : null);
            event.put("userId",   userId != null   ? userId.toString()   : null);
            event.put("artistId", artistId != null ? artistId.toString() : null);
            event.put("type",     type.name());
            event.put("occurredAt", java.time.Instant.now().toString());

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.SOCIAL_ENGAGEMENT_FANOUT_EXCHANGE,
                    "",
                    event);

            log.debug("[Engagement] Published {} for songId={}", type, songId);
        } catch (Exception e) {
            // Best-effort: never let event publishing break the social action
            log.warn("[Engagement] Failed to publish {} for songId={}: {}", type, songId, e.getMessage());
        }
    }
}
