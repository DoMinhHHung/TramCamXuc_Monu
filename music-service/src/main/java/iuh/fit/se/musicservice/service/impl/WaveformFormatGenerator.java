package iuh.fit.se.musicservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaveformFormatGenerator {

    private final WaveformServiceImpl waveformService;

    @Async("waveformTaskExecutor")
    public void generateAsync(UUID songId, List<Float> waveformData) {
        try {
            waveformService.generateFormatsInternal(songId, waveformData);
            log.info("Completed async waveform generation for song: {}", songId);
        } catch (Exception e) {
            log.error("Async waveform generation failed for song: {}", songId, e);
        }
    }
}
