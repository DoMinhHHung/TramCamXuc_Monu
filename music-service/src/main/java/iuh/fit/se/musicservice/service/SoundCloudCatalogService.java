package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.SoundCloudStreamResponse;
import iuh.fit.se.musicservice.dto.response.SoundCloudTrackResponse;

import java.util.List;

public interface SoundCloudCatalogService {

    /**
     * Tìm kiếm track trên SoundCloud.
     * Chỉ trả về tracks có access = "playback" (streamable off-platform).
     *
     * @param keyword từ khóa tìm kiếm
     * @param limit   số kết quả tối đa (1-50)
     */
    List<SoundCloudTrackResponse> searchTracks(String keyword, int limit);

    /**
     * Lấy HLS stream URL cho một track cụ thể.
     * Stream URL là temporary presigned URL — client phải dùng ngay,
     * KHÔNG cache hay lưu trữ audio.
     *
     * @param trackUrn URN của track (dạng "soundcloud:tracks:123456")
     */
    SoundCloudStreamResponse getStreamUrl(String trackUrn);
}