package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.WaveformDataResponse;
import iuh.fit.se.musicservice.enums.WaveformFormat;

import java.util.List;
import java.util.UUID;

public interface WaveformService {


    String generateAndSaveWaveform(UUID songId, String rawFileKey);

    WaveformDataResponse getWaveformDataComplete(UUID songId);

    List<Float> getWaveformData(UUID songId);

    String getWaveformUrl(UUID songId, WaveformFormat format);

    void deleteWaveformData(UUID songId);

    void clearWaveformCache(UUID songId);

    void generateAndSaveWaveformAsync(UUID songId, String rawFileKey);
}
