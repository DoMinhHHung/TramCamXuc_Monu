package iuh.fit.se.adsservice.consumer;

import iuh.fit.se.adsservice.config.RabbitMQConfig;
import iuh.fit.se.adsservice.event.SongListenEvent;
import iuh.fit.se.adsservice.service.AdSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;


@Component
@RequiredArgsConstructor
@Slf4j
public class SongListenEventConsumer {

    private final AdSessionService sessionService;

    @RabbitListener(queues = RabbitMQConfig.ADS_LISTEN_QUEUE)
    public void handleSongListened(SongListenEvent event) {
        if (event.getUserId() == null) {
            // Guest user – không cần track ad session
            return;
        }

        int duration = event.getDurationSeconds();
        log.debug("SongListenEvent: userId={}, songId={}, durationSeconds={}",
                event.getUserId(), event.getSongId(), duration);

        // Cộng dồn vào session, chỉ truyền duration thực tế của bài
        // (nếu duration=0 thì onSongListened vẫn tăng songCount, chỉ không cộng listenedSeconds)
        sessionService.onSongListened(event.getUserId(), duration);
    }
}
