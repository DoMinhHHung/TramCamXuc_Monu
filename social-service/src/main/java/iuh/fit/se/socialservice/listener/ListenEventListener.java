package iuh.fit.se.socialservice.listener;

import iuh.fit.se.socialservice.config.RabbitMQConfig;
import iuh.fit.se.socialservice.dto.message.SongListenEvent;
import iuh.fit.se.socialservice.service.ListenHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ListenEventListener {

    private final ListenHistoryService listenHistoryService;

    @RabbitListener(queues = RabbitMQConfig.LISTEN_HISTORY_QUEUE)
    public void handleListenEvent(SongListenEvent event) {
        try {
            log.debug("Received listen event: songId={}, userId={}", event.getSongId(), event.getUserId());
            listenHistoryService.recordListen(event);
        } catch (Exception e) {
            log.error("Failed to process listen event: {}", e.getMessage(), e);
        }
    }
}
