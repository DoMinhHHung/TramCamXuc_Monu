package iuh.fit.se.social.service.impl;

import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.SongListenEvent;
import iuh.fit.se.social.document.ListenHistory;
import iuh.fit.se.social.repository.ListenHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ListenHistoryWorker {

    private final ListenHistoryRepository listenHistoryRepository;

    @RabbitListener(queues = "listen.history.queue")
    public void handle(SongListenEvent event) {
        try {
            ListenHistory record = ListenHistory.builder()
                    .listenedAt(event.getListenedAt())
                    .durationSeconds(event.getDurationSeconds())
                    .meta(ListenHistory.ListenMeta.builder()
                            .songId(event.getSongId())
                            .artistId(event.getArtistId())
                            .userId(event.getUserId())
                            .playlistId(event.getPlaylistId())
                            .albumId(event.getAlbumId())
                            .build())
                    .build();

            listenHistoryRepository.save(record);
            log.debug("History saved: song={} user={}", event.getSongId(), event.getUserId());
        } catch (Exception e) {
            log.error("Failed to save listen history for song={}", event.getSongId(), e);
            throw e;
        }
    }
}