package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.message.FeedContentEvent;
import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.entity.AlbumSong;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.AlbumStatus;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.repository.AlbumRepository;
import iuh.fit.se.musicservice.repository.AlbumSongRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.AlbumAutoPublishService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlbumAutoPublishServiceImpl implements AlbumAutoPublishService {

    private final AlbumRepository albumRepository;
    private final AlbumSongRepository albumSongRepository;
    private final SongRepository songRepository;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    public void publishScheduledAlbum(UUID albumId) {
        Album album = albumRepository.findById(albumId).orElse(null);
        if (album == null) {
            log.warn("[AlbumAutoPublish] album not found: {}", albumId);
            return;
        }
        if (album.getStatus() == AlbumStatus.PUBLIC) {
            return;
        }
        if (album.getScheduledPublishAt() == null) {
            return;
        }
        if (album.getScheduledPublishAt().isAfter(ZonedDateTime.now())) {
            return;
        }

        if (albumSongRepository.countByAlbumId(albumId) == 0) {
            log.warn("[AlbumAutoPublish] skip empty album {}", albumId);
            return;
        }

        List<AlbumSong> nodes = albumSongRepository.findAllByAlbumId(albumId);
        Set<UUID> songIds = nodes.stream().map(AlbumSong::getSongId).collect(Collectors.toSet());
        List<Song> songs = songRepository.findAllById(songIds);
        boolean allReady = songs.stream().allMatch(s ->
                s.getTranscodeStatus() == TranscodeStatus.COMPLETED
                        && (s.getStatus() == SongStatus.PUBLIC || s.getStatus() == SongStatus.ALBUM_ONLY));
        if (!allReady) {
            log.warn("[AlbumAutoPublish] skip album {} — songs not ready", albumId);
            return;
        }

        List<AlbumSong> nodesToUpdate = albumSongRepository.findAllByAlbumId(albumId);
        Set<UUID> songIdsToUpdate = nodesToUpdate.stream().map(AlbumSong::getSongId).collect(Collectors.toSet());
        List<Song> songsToUpdate = songRepository.findAllById(songIdsToUpdate);
        for (Song s : songsToUpdate) {
            if (s.getStatus() == SongStatus.ALBUM_ONLY) {
                s.setStatus(SongStatus.PUBLIC);
                songRepository.save(s);
            }
        }

        album.setStatus(AlbumStatus.PUBLIC);
        album.setScheduledPublishAt(null);
        album.setScheduleCommittedAt(null);
        if (album.getPublishedAt() == null) {
            album.setPublishedAt(ZonedDateTime.now());
        }
        albumRepository.save(album);
        log.info("[AlbumAutoPublish] published album {}", albumId);
        publishToFeed(album);
    }

    private void publishToFeed(Album album) {
        try {
            FeedContentEvent event = FeedContentEvent.builder()
                    .contentId(album.getId())
                    .contentType(FeedContentEvent.ContentType.ALBUM)
                    .artistId(album.getOwnerArtistId())
                    .title(album.getTitle())
                    .coverImageUrl(album.getCoverUrl())
                    .visibility(FeedContentEvent.Visibility.PUBLIC)
                    .publishedAt(Instant.now())
                    .build();
            rabbitTemplate.convertAndSend(RabbitMQConfig.FEED_FANOUT_EXCHANGE, "", event);
        } catch (Exception e) {
            log.warn("[AlbumAutoPublish] feed event failed for {}: {}", album.getId(), e.getMessage());
        }
    }
}
