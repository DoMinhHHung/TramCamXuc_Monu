package iuh.fit.se.musicservice.service.impl;

import com.rabbitmq.client.Channel;
import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SongTranscodeResultListener {

    private final SongRepository songRepository;

    @RabbitListener(queues = RabbitMQConfig.TRANSCODE_SUCCESS_QUEUE, ackMode = "MANUAL")
    @Transactional
    public void handleTranscodeSuccess(
            Map<String, Object> message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        String songIdStr = null;
        try {
            songIdStr = (String) message.get("songId");
            UUID songId        = UUID.fromString(songIdStr);
            int  duration      = ((Number) message.get("duration")).intValue();
            String hlsMasterUrl = (String) message.get("hlsMasterUrl");

            songRepository.findById(songId).ifPresentOrElse(song -> {
                song.setTranscodeStatus(TranscodeStatus.COMPLETED);
                song.setDurationSeconds(duration);
                song.setHlsMasterUrl(hlsMasterUrl);

                if (song.getStatus() == SongStatus.DRAFT) {
                    song.setStatus(SongStatus.PUBLIC);
                }

                songRepository.save(song);
                log.info("Song {} transcoded successfully → PUBLIC. Duration={}s, HLS={}",
                        songId, duration, hlsMasterUrl);

            }, () -> log.warn("Transcode callback: song {} not found in DB", songId));

            channel.basicAck(deliveryTag, false);

        } catch (Exception e) {
            log.error("Failed to handle transcode success callback for songId={}: {}",
                    songIdStr, e.getMessage(), e);
            try {
                channel.basicNack(deliveryTag, false, false);
            } catch (IOException ioEx) {
                log.error("Failed to NACK transcode success message: {}", ioEx.getMessage());
            }
        }
    }
}