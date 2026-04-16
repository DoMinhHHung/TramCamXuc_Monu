package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.WaveformService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class WaveformBackfillJob {

    private final SongRepository songRepository;
    private final WaveformService waveformService;

    @Scheduled(fixedDelayString = "${waveform.backfill.fixed-delay-ms:600000}", initialDelayString = "${waveform.backfill.initial-delay-ms:30000}")
    public void backfillMissingWaveforms() {
        List<Song> songs = songRepository.findCompletedSongsMissingWaveform();
        if (songs.isEmpty()) {
            return;
        }

        for (Song song : songs) {
            try {
                backfillSingleSong(song.getId(), song.getRawFileKey());
            } catch (Exception e) {
                log.warn("Failed to backfill waveform for song {}", song.getId(), e);
            }
        }
    }

    @Transactional
    public void backfillSingleSong(UUID songId, String rawFileKey) {
        if (rawFileKey == null || rawFileKey.isBlank()) {
            log.debug("Skipping backfill for song {} because rawFileKey is empty", songId);
            return;
        }

        String waveformUrl = waveformService.generateAndSaveWaveform(songId, rawFileKey);
        if (waveformUrl == null || waveformUrl.isBlank()) {
            log.debug("No waveform generated for song {}", songId);
            return;
        }

        songRepository.findById(songId).ifPresent(song -> {
            song.setWaveformUrl(waveformUrl);
            songRepository.save(song);
            log.info("Backfilled waveform_url for song {}", songId);
        });
    }
}
