package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SoundCloudStreamResponse;
import iuh.fit.se.musicservice.dto.response.SoundCloudTrackResponse;
import iuh.fit.se.musicservice.service.SoundCloudCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * SoundCloud integration — Metadata search + stream URL proxy.
 *
 * KHÔNG: download audio, lưu file, transcode, hay aggregate với nhạc khác.
 * CHỈ:   trả metadata + temporary stream URL để client phát trực tiếp từ SoundCloud.
 *
 * Client phải:
 *   1. Hiển thị uploaderName ("Music by <artist>")
 *   2. Hiển thị logo SoundCloud + text "Provided by SoundCloud"
 *   3. Render permalinkUrl dạng nút "Nghe trên SoundCloud"
 */
@RestController
@RequestMapping("/soundcloud")
@RequiredArgsConstructor
public class SoundCloudController {

    private final SoundCloudCatalogService soundCloudCatalogService;

    /**
     * Tìm kiếm track trên SoundCloud.
     * Kết quả chỉ bao gồm tracks có access=playback (stream được off-platform).
     *
     * GET /soundcloud/tracks/search?keyword=lofi&limit=10
     */
    @GetMapping("/tracks/search")
    public ApiResponse<List<SoundCloudTrackResponse>> searchTracks(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit) {

        return ApiResponse.<List<SoundCloudTrackResponse>>builder()
                .result(soundCloudCatalogService.searchTracks(keyword, limit))
                .build();
    }

    /**
     * Lấy HLS AAC stream URL cho một track.
     * URL trả về là temporary presigned URL — client stream trực tiếp.
     *
     * QUAN TRỌNG: Client PHẢI hiển thị attribution (permalinkUrl, uploaderName, SoundCloud logo).
     * Không cache audio, không lưu file.
     *
     * GET /soundcloud/stream?urn=soundcloud:tracks:123456
     */
    @GetMapping("/stream")
    public ApiResponse<SoundCloudStreamResponse> getStreamUrl(
            @RequestParam String urn) {

        return ApiResponse.<SoundCloudStreamResponse>builder()
                .result(soundCloudCatalogService.getStreamUrl(urn))
                .build();
    }
}