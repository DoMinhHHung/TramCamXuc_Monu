package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.PlaylistCreateRequest;
import iuh.fit.se.music.dto.request.PlaylistUpdateRequest;
import iuh.fit.se.music.dto.request.ReorderRequest;
import iuh.fit.se.music.dto.response.PlaylistResponse;
import iuh.fit.se.music.service.PlaylistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;

    // ── PUBLIC / COLLABORATIVE ───────────────────────────────────

    /**
     * Xem playlist qua slug — share link.
     * PUBLIC + COLLABORATIVE: ai cũng xem được (kể cả chưa login).
     * PRIVATE: phải là chủ mới xem được.
     *
     * GET /playlists/nhac-chill-a1b2c3d4
     */
    @GetMapping("/{slug}")
    public ApiResponse<PlaylistResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.<PlaylistResponse>builder()
                .result(playlistService.getBySlug(slug))
                .build();
    }

    // ── AUTHENTICATED ────────────────────────────────────────────

    /** Danh sách playlist của tôi */
    @GetMapping("/my-playlists")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Page<PlaylistResponse>> getMyPlaylists(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<PlaylistResponse>>builder()
                .result(playlistService.getMyPlaylists(
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    /**
     * Tạo playlist mới (check subscription limit).
     * POST /playlists
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PlaylistResponse> createPlaylist(
            @RequestBody @Valid PlaylistCreateRequest request) {

        return ApiResponse.<PlaylistResponse>builder()
                .result(playlistService.createPlaylist(request))
                .build();
    }

    /**
     * Cập nhật tên, mô tả, visibility.
     * PUT /playlists/{id}
     */
    @PutMapping("/{playlistId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PlaylistResponse> updatePlaylist(
            @PathVariable UUID playlistId,
            @RequestBody @Valid PlaylistUpdateRequest request) {

        return ApiResponse.<PlaylistResponse>builder()
                .result(playlistService.updatePlaylist(playlistId, request))
                .build();
    }

    /**
     * Xóa playlist.
     * DELETE /playlists/{id}
     */
    @DeleteMapping("/{playlistId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> deletePlaylist(@PathVariable UUID playlistId) {
        playlistService.deletePlaylist(playlistId);
        return ApiResponse.<Void>builder().message("Playlist deleted.").build();
    }

    /**
     * Upload ảnh bìa playlist.
     * POST /playlists/{id}/cover
     */
    @PostMapping(value = "/{playlistId}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PlaylistResponse> uploadCover(
            @PathVariable UUID playlistId,
            @RequestPart("file") MultipartFile file) {

        return ApiResponse.<PlaylistResponse>builder()
                .result(playlistService.uploadCover(playlistId, file))
                .build();
    }

    // ── SONGS ────────────────────────────────────────────────────

    /**
     * Thêm bài hát vào cuối playlist.
     * Bài phải PUBLIC + APPROVED + transcoded.
     * POST /playlists/{id}/songs/{songId}
     */
    @PostMapping("/{playlistId}/songs/{songId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PlaylistResponse> addSong(
            @PathVariable UUID playlistId,
            @PathVariable UUID songId) {

        return ApiResponse.<PlaylistResponse>builder()
                .result(playlistService.addSong(playlistId, songId))
                .build();
    }

    /**
     * Xóa bài hát khỏi playlist.
     * DELETE /playlists/{id}/songs/{songId}
     */
    @DeleteMapping("/{playlistId}/songs/{songId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> removeSong(
            @PathVariable UUID playlistId,
            @PathVariable UUID songId) {

        playlistService.removeSong(playlistId, songId);
        return ApiResponse.<Void>builder().message("Song removed.").build();
    }

    /**
     * Drag & drop reorder — gọi mỗi khi user thả item vào vị trí mới.
     *
     * PATCH /playlists/{id}/songs/reorder
     * {
     *   "draggedId": "uuid-of-PlaylistSong-node",
     *   "prevId":    "uuid-of-node-before"  // null nếu kéo lên đầu
     *   "nextId":    "uuid-of-node-after"   // null nếu kéo xuống cuối
     * }
     */
    @PatchMapping("/{playlistId}/songs/reorder")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PlaylistResponse> reorder(
            @PathVariable UUID playlistId,
            @RequestBody @Valid ReorderRequest request) {

        return ApiResponse.<PlaylistResponse>builder()
                .result(playlistService.reorder(playlistId, request))
                .build();
    }
}