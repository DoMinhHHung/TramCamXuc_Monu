package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.event.SongSoftDeletedEvent;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.helper.MinioHelper;
import iuh.fit.se.musicservice.repository.AlbumSongRepository;
import iuh.fit.se.musicservice.repository.PlaylistSongRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SongServiceImpl implements SongService {

    private final SongRepository songRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final AlbumSongRepository albumSongRepository;
    private final MinioHelper minioHelper;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    public void softDeleteReportedSong(UUID songId, String adminId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        song.setStatus(SongStatus.DELETED);
        songRepository.save(song);

        playlistSongRepository.deleteAllBySongId(songId);
        albumSongRepository.deleteAllBySongId(songId);

        try {
            minioHelper.deleteRawSongObject(song.getRawFileKey());
            minioHelper.deletePublicObjectByUrl(song.getThumbnailUrl());
            String hlsFolderPrefix = minioHelper.extractHlsFolderPrefix(song.getHlsMasterUrl());
            minioHelper.deletePublicFolderByPrefix(hlsFolderPrefix);
        } catch (Exception ex) {
            log.error("MinIO cleanup failed for songId={} but DB soft delete committed", songId, ex);
        }

        SongSoftDeletedEvent event = SongSoftDeletedEvent.builder()
                .songId(songId)
                .adminId(adminId)
                .deletedAt(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MUSIC_EVENT_EXCHANGE,
                RabbitMQConfig.SONG_SOFT_DELETED_ROUTING_KEY,
                event
        );
    }
}
