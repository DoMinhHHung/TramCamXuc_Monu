package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.SongService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/songs")
@RequiredArgsConstructor
public class SongController {

    private final SongService songService;

    // ===================== PUBLIC =====================

    /**
     * Tìm kiếm bài hát PUBLIC.
     * GET /songs?keyword=&genreId=&artistId=&page=1&size=20
     */
    @GetMapping
    public ApiResponse<Page<SongResponse>> searchSongs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID genreId,
            @RequestParam(required = false) UUID artistId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.searchSongs(keyword, genreId, artistId, pageable))
                .build();
    }

    /**
     * Danh sách bài hát thịnh hành (sắp xếp theo playCount).
     * GET /songs/trending
     */
    @GetMapping("/trending")
    public ApiResponse<Page<SongResponse>> getTrending(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getTrending(PageRequest.of(page - 1, size)))
                .build();
    }

    /**
     * Batch fetch nhiều bài hát theo danh sách IDs — dùng cho recommendation-service.
     * GET /songs/batch?ids=id1,id2,...
     */
    @GetMapping("/batch")
    public ApiResponse<List<SongResponse>> getSongsByIds(
            @RequestParam List<UUID> ids) {
        return ApiResponse.<List<SongResponse>>builder()
                .result(songService.getSongsByIds(ids))
                .build();
    }

    /**
     * Danh sách bài hát mới nhất.
     * GET /songs/newest
     */
    @GetMapping("/newest")
    public ApiResponse<Page<SongResponse>> getNewest(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getNewest(PageRequest.of(page - 1, size)))
                .build();
    }

    /**
     * Lấy thông tin bài hát PUBLIC theo ID.
     * GET /songs/{songId}
     */
    @GetMapping("/{songId}")
    public ApiResponse<SongResponse> getSongById(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.getSongById(songId))
                .build();
    }

    /**
     * Danh sách bài hát PUBLIC của một nghệ sĩ.
     * GET /songs/by-artist/{artistId}
     */
    @GetMapping("/by-artist/{artistId}")
    public ApiResponse<Page<SongResponse>> getSongsByArtist(
            @PathVariable UUID artistId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getSongsByArtist(artistId, pageable))
                .build();
    }

    /**
     * Ghi nhận lượt play (chỉ tăng playCount, không cần login).
     * POST /songs/{songId}/play
     */
    @PostMapping("/{songId}/play")
    public ApiResponse<Void> recordPlay(@PathVariable UUID songId) {
        songService.recordPlay(songId);
        return ApiResponse.<Void>builder().message("Play recorded.").build();
    }

    /**
     * Ghi nhận lượt nghe đầy đủ — dùng cho trending analytics.
     * POST /songs/{songId}/listen
     */
    @PostMapping("/{songId}/listen")
    public ApiResponse<Void> recordListen(
            @PathVariable UUID songId,
            @RequestParam(required = false) UUID playlistId,
            @RequestParam(required = false) UUID albumId,
            @RequestParam(defaultValue = "30")    int durationSeconds,
            @RequestParam(defaultValue = "false") boolean completed) {

        songService.recordListen(songId, playlistId, albumId, durationSeconds, completed);
        return ApiResponse.<Void>builder().message("Listen recorded.").build();
    }

    // ===================== AUTHENTICATED =====================

    /**
     * Lấy URL stream HLS cho bài hát với quality dựa trên subscription tier.
     * 
     * AUTHENTICATION: Required for ALL songs (including PUBLIC)
     * 
     * QUALITY TIERS:
     * - Free/No subscription: 64kbps
     * - Basic tier: 128kbps
     * - Premium tier: 256kbps
     * - Lossless tier: 320kbps
     * - Owner/Admin: Full quality (master.m3u8 adaptive streaming)
     * 
     * PRIVATE/DRAFT songs: Only owner or admin can access (full quality)
     * 
     * Returns: MinIO presigned URL (15 min expiry) for direct streaming from MinIO
     * 
     * GET /songs/{songId}/stream
     */
    @GetMapping("/{songId}/stream")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getStreamUrl(@PathVariable UUID songId) {
        return ApiResponse.<String>builder()
                .result(songService.getStreamUrl(songId))
                .build();
    }

    /**
     * Lấy presigned URL để tải bài hát (yêu cầu subscription có feature download).
     * GET /songs/{songId}/download
     */
    @GetMapping("/{songId}/download")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getDownloadUrl(@PathVariable UUID songId) {
        return ApiResponse.<String>builder()
                .result(songService.getDownloadUrl(songId))
                .message("Link hợp lệ trong 5 phút.")
                .build();
    }

    // ===================== ARTIST =====================

    /**
     * Lấy danh sách bài hát của artist đang đăng nhập (kể cả DRAFT, PRIVATE).
     * GET /songs/my-songs
     */
    @GetMapping("/my-songs")
    @PreAuthorize("hasAnyRole('ARTIST', 'USER')")
    public ApiResponse<Page<SongResponse>> getMySongs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getMySongs(pageable))
                .build();
    }

    /**
     * Chi tiết bài hát của owner (ALBUM_ONLY, PRIVATE, …).
     * GET /songs/my/{songId}
     */
    @GetMapping("/my/{songId}")
    @PreAuthorize("hasAnyRole('ARTIST', 'USER')")
    public ApiResponse<SongResponse> getMySongById(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.getMySongById(songId))
                .build();
    }

    /**
     * Bước 1 — Tạo record bài hát + nhận presigned URL để upload file lên MinIO.
     * POST /songs/request-upload
     */
    @PostMapping("/request-upload")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> requestUploadUrl(
            @RequestBody @Valid SongCreateRequest request) {

        return ApiResponse.<SongResponse>builder()
                .result(songService.requestUploadUrl(request))
                .build();
    }

    /**
     * Bước 2 — Artist xác nhận đã PUT file lên MinIO xong → trigger transcode.
     * POST /songs/{songId}/confirm
     */
    @PostMapping("/{songId}/confirm")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> confirmUpload(@PathVariable UUID songId) {
        songService.confirmUpload(songId);
        return ApiResponse.<Void>builder()
                .message("Upload confirmed. Transcoding started.")
                .build();
    }

    /**
     * Cập nhật thông tin bài hát (title, genres, status PUBLIC↔PRIVATE).
     * PUT /songs/{songId}
     */
    @PutMapping("/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> updateSong(
            @PathVariable UUID songId,
            @RequestBody @Valid SongUpdateRequest request) {

        return ApiResponse.<SongResponse>builder()
                .result(songService.updateSong(songId, request))
                .build();
    }

    /**
     * Artist tự xóa mềm bài hát của mình.
     * DELETE /songs/{songId}
     */
    @DeleteMapping("/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> deleteSong(@PathVariable UUID songId) {
        songService.deleteSong(songId);
        return ApiResponse.<Void>builder().message("Song deleted successfully.").build();
    }
}
