package iuh.fit.se.music.service.impl;

import iuh.fit.se.music.entity.Album;
import iuh.fit.se.music.entity.AlbumSong;
import iuh.fit.se.music.enums.AlbumVisibility;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.repository.AlbumRepository;
import iuh.fit.se.music.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlbumSchedulerService {

    private final AlbumRepository albumRepository;
    private final SongRepository  songRepository;

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void autoPublishScheduledAlbums() {
        List<Album> albums =
                albumRepository.findAlbumsReadyToPublish(ZonedDateTime.now());

        if (albums.isEmpty()) return;
        log.info("[Scheduler] Auto-publish: found {} album(s)", albums.size());

        for (Album album : albums) {
            try {
                album.getAlbumSongs().stream()
                        .map(AlbumSong::getSong)
                        .filter(s -> s.getStatus() == SongStatus.ALBUM_ONLY)
                        .forEach(s -> {
                            s.setStatus(SongStatus.PUBLIC);
                            songRepository.save(s);
                        });

                album.setVisibility(AlbumVisibility.PUBLIC);
                album.setScheduledPublishAt(null);
                albumRepository.save(album);

                log.info("[Scheduler] Album {} auto-published", album.getId());
            } catch (Exception e) {
                log.error("[Scheduler] Failed album {}: {}",
                        album.getId(), e.getMessage());
            }
        }
    }
}