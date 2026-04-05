package iuh.fit.se.socialservice.listener;

import com.rabbitmq.client.Channel;
import iuh.fit.se.socialservice.config.RabbitMQConfig;
import iuh.fit.se.socialservice.dto.message.FeedContentEvent;
import iuh.fit.se.socialservice.service.FeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class FeedEventListener {

    private final FeedService feedService;

    @RabbitListener(queues = RabbitMQConfig.FEED_SOCIAL_QUEUE, ackMode = "MANUAL")
    public void handleFeedEvent(FeedContentEvent event,
                                Channel channel,
                                @Header(AmqpHeaders.DELIVERY_TAG) long tag)
            throws IOException {
        try {
            feedService.createFromEvent(event);
            channel.basicAck(tag, false);
            log.info("Feed post created from event: albumId={}", event.getContentId());
        } catch (Exception e) {
            log.error("Failed to process feed event albumId={}: {}",
                    event.getContentId(), e.getMessage(), e);
            channel.basicNack(tag, false, false);
        }
    }
}