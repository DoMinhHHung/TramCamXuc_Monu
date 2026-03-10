package iuh.fit.se.socialservice.listener;

import com.rabbitmq.client.Channel;
import iuh.fit.se.socialservice.config.RabbitMQConfig;
import iuh.fit.se.socialservice.dto.message.SongListenEvent;
import iuh.fit.se.socialservice.service.ListenHistoryService;
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
public class ListenEventListener {

    private final ListenHistoryService listenHistoryService;

    @RabbitListener(queues = RabbitMQConfig.LISTEN_HISTORY_QUEUE, ackMode = "MANUAL")
    public void handleListenEvent(SongListenEvent event, Channel channel,
                                  @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        try {
            listenHistoryService.recordListen(event);
            channel.basicAck(tag, false);
        } catch (Exception e) {
            log.error("Failed to process listen event: {}", e.getMessage(), e);
            channel.basicNack(tag, false, false);
        }
    }
}
