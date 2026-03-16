package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumReorderRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.service.AlbumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * REST controller cho Album module.
 *
 * Routes:
 *   Public:
 *     GET  /albums                              – danh sách album PUBLIC
 *     GET  /albums/{albumId}                    – chi tiết album PUBLIC (kèm songs)
 *
 *   Artist (ROLE_ARTIST):
 *     POST /albums                              – tạo album
 *     GET  /albums/my                           – album của tôi
 *     GET  /albums/my/{albumId}                 – chi tiết (draft/private/public)
 *     PUT  /albums/{albumId}                    – cập nhật metadata
 *     DELETE /albums/{albumId}                  – xóa album
 *
 *     POST /albums/{albumId}/songs/{songId}     – thêm bài hát
 *     DELETE /albums/{albumId}/songs/{songId}   – xóa bài hát
 *     PUT  /albums/{albumId}/songs/reorder      – drag-and-drop reorder
 *
 *     POST /albums/{albumId}/publish            – publish ngay
 *     POST /albums/{albumId}/unpublish          – đưa về PRIVATE
 *     POST /albums/{albumId}/schedule           – lên lịch publish
 *     DELETE /albums/{albumId}/schedule         – huỷ lịch
 */
@RestController
@RequestMapping("/albums")
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    // ── Public ─────────────────────────────────────────────────────────────────

    @GetMapping
    public ApiResponse<Page<AlbumResponse>> getPublicAlbums(
            @RequestParam(required = false) String artistId,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<Page<AlbumResponse>>builder()
                .result(albumService.getPublicAlbums(artistId,
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    @GetMapping("/{albumId}")
    public ApiResponse<AlbumResponse> getPublicAlbumDetail(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.getPublicAlbumDetail(albumId))
                .build();
    }

    // ── Artist: CRUD ───────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> createAlbum(
            @Valid @RequestBody AlbumCreateRequest request) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.createAlbum(request))
                .build();
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Page<AlbumResponse>> getMyAlbums(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<Page<AlbumResponse>>builder()
                .result(albumService.getMyAlbums(
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    @GetMapping("/my/{albumId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> getMyAlbumDetail(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.getAlbumDetail(albumId))
                .build();
    }

    @PutMapping("/{albumId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> updateAlbum(
            @PathVariable UUID albumId,
            @Valid @RequestBody AlbumUpdateRequest request) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.updateAlbum(albumId, request))
                .build();
    }

    @DeleteMapping("/{albumId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> deleteAlbum(@PathVariable UUID albumId) {
        albumService.deleteAlbum(albumId);
        return ApiResponse.<Void>builder().build();
    }

    // ── Artist: Song management ────────────────────────────────────────────────

    @PostMapping("/{albumId}/songs/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> addSong(
            @PathVariable UUID albumId,
            @PathVariable UUID songId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.addSongToAlbum(albumId, songId))
                .build();
    }

    @DeleteMapping("/{albumId}/songs/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> removeSong(
            @PathVariable UUID albumId,
            @PathVariable UUID songId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.removeSongFromAlbum(albumId, songId))
                .build();
    }

    /**
     * Drag-and-drop reorder.
     *
     * Body: { "draggedId": "...", "prevId": "..." (nullable), "nextId": "..." (nullable) }
     * draggedId = AlbumSong.id (KHÔNG phải songId)
     *
     * PUT /albums/{albumId}/songs/reorder
     */
    @PutMapping("/{albumId}/songs/reorder")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> reorderSong(
            @PathVariable UUID albumId,
            @Valid @RequestBody AlbumReorderRequest request) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.reorderSong(albumId, request))
                .build();
    }

    // ── Artist: Publishing ─────────────────────────────────────────────────────

    @PostMapping("/{albumId}/publish")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> publishAlbum(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.publishAlbum(albumId))
                .build();
    }

    @PostMapping("/{albumId}/unpublish")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> unpublishAlbum(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.unpublishAlbum(albumId))
                .build();
    }

    /**
     * Lên lịch publish.
     *
     * POST /albums/{albumId}/schedule?at=2025-12-31T20:00:00+07:00
     */
    @PostMapping("/{albumId}/schedule")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> schedulePublish(
            @PathVariable UUID albumId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime at) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.schedulePublish(albumId, at))
                .build();
    }

    @DeleteMapping("/{albumId}/schedule")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> cancelSchedule(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.cancelScheduledPublish(albumId))
                .build();
    }
}
