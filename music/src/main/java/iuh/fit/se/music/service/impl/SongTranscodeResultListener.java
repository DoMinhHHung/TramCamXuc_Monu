package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.TranscodeSuccessMessage;
import iuh.fit.se.music.enums.TranscodeStatus;
import iuh.fit.se.music.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class SongTranscodeResultListener {

    private final SongRepository songRepository;

    @RabbitListener(queues = RabbitMQConfig.TRANSCODE_SUCCESS_QUEUE)
    @Transactional
    public void handleTranscodeSuccess(TranscodeSuccessMessage message) {
        log.info("Music Service received SUCCESS callback for Song: {}", message.getSongId());

        songRepository.findById(message.getSongId()).ifPresent(song -> {
            song.setTranscodeStatus(TranscodeStatus.COMPLETED);
            song.setDurationSeconds(message.getDuration());
            song.setHlsMasterUrl(message.getHlsMasterUrl());

            songRepository.save(song);

            log.info("Song {} is now ACTIVE and ready to stream. Duration: {}s", song.getId(), song.getDurationSeconds());
        });
    }
}