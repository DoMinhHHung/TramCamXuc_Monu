package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.WaveformDataResponse;
import iuh.fit.se.musicservice.enums.WaveformFormat;

import java.util.List;
import java.util.UUID;

/**
 * Service để tạo waveform từ file audio.
 * Hỗ trợ cả generate PNG visualization + JSON data + SVG.
 */
public interface WaveformService {

    /**
     * Generate waveform data từ file audio đã upload.
     * Lưu cả PNG, SVG, và JSON data vào MinIO (tuỳ enabledFormats config).
     *
     * @param songId      ID của bài hát
     * @param rawFileKey  Key của file audio trong MinIO
     * @return URL của default waveform format (PNG)
     */
    String generateAndSaveWaveform(UUID songId, String rawFileKey);

    /**
     * Lấy complete waveform data với metadata và format URLs.
     *
     * @param songId ID của bài hát
     * @return WaveformDataResponse với amplitudes, stats, và format URLs
     */
    WaveformDataResponse getWaveformDataComplete(UUID songId);

    /**
     * Lấy waveform data (JSON array) từ MinIO.
     *
     * @param songId ID của bài hát
     * @return List các amplitude values (0-100)
     */
    List<Float> getWaveformData(UUID songId);

    /**
     * Lấy waveform URL cho format cụ thể.
     *
     * @param songId ID của bài hát
     * @param format WaveformFormat (PNG, SVG, JSON)
     * @return Public URL hoặc null nếu format không được support/tạo
     */
    String getWaveformUrl(UUID songId, WaveformFormat format);

    /**
     * Xóa waveform data khỏi MinIO.
     *
     * @param songId ID của bài hát
     */
    void deleteWaveformData(UUID songId);

    /**
     * Clear waveform cache cho 1 bài hát.
     *
     * @param songId ID của bài hát
     */
    void clearWaveformCache(UUID songId);
}
