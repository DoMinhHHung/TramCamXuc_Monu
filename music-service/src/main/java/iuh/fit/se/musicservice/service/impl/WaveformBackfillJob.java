package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.WaveformFormat;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.WaveformService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WaveformBackfillJob {

    private final SongRepository songRepository;
    private final WaveformService waveformService;

    @Scheduled(fixedDelayString = "${waveform.backfill.fixed-delay-ms:600000}", initialDelayString = "${waveform.backfill.initial-delay-ms:30000}")
    @Transactional
    public void backfillMissingWaveforms() {
        List<Song> songs = songRepository.findCompletedSongsMissingWaveform();
        if (songs.isEmpty()) {
            return;
        }

        for (Song song : songs) {
            try {
                String waveformUrl = waveformService.getWaveformUrl(song.getId(), WaveformFormat.PNG);
                if (waveformUrl == null && song.getRawFileKey() != null && !song.getRawFileKey().isBlank()) {
                    waveformUrl = waveformService.generateAndSaveWaveform(song.getId(), song.getRawFileKey());
                }

                if (waveformUrl != null && !waveformUrl.isBlank()) {
                    song.setWaveformUrl(waveformUrl);
                    songRepository.save(song);
                    log.info("Backfilled waveform_url for song {}", song.getId());
                } else {
                    log.debug("No waveform available yet for song {}", song.getId());
                }
            } catch (Exception e) {
                log.warn("Failed to backfill waveform for song {}", song.getId(), e);
            }
        }
    }
}
