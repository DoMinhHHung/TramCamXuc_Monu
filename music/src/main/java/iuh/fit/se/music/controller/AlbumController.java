package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.AlbumCreateRequest;
import iuh.fit.se.music.dto.request.AlbumUpdateRequest;
import iuh.fit.se.music.dto.response.AlbumResponse;
import iuh.fit.se.music.service.AlbumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZonedDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/albums")
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    // ── Public ────────────────────────────────────────────

    @GetMapping("/{albumId}")
    public ApiResponse<AlbumResponse> getPublicAlbum(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.getPublicAlbum(albumId)).build();
    }

    @GetMapping("/by-artist/{artistId}")
    public ApiResponse<Page<AlbumResponse>> getByArtist(
            @PathVariable UUID artistId,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<Page<AlbumResponse>>builder()
                .result(albumService.getPublicAlbumsByArtist(artistId,
                        PageRequest.of(page - 1, size,
                                Sort.by("createdAt").descending()))).build();
    }

    // ── Artist (OWNER) ────────────────────────────────────

    @GetMapping("/my-albums")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Page<AlbumResponse>> getMyAlbums(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<Page<AlbumResponse>>builder()
                .result(albumService.getMyAlbums(
                        PageRequest.of(page - 1, size,
                                Sort.by("createdAt").descending()))).build();
    }

    @GetMapping("/my-albums/{albumId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> getMyAlbumDetail(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.getMyAlbumDetail(albumId)).build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> createAlbum(
            @RequestBody @Valid AlbumCreateRequest request) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.createAlbum(request)).build();
    }

    @PutMapping("/{albumId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> updateAlbum(
            @PathVariable UUID albumId,
            @RequestBody @Valid AlbumUpdateRequest request) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.updateAlbum(albumId, request)).build();
    }

    @PostMapping(value = "/{albumId}/cover",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> uploadCover(
            @PathVariable UUID albumId,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.uploadCover(albumId, file)).build();
    }

    @DeleteMapping("/{albumId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> deleteAlbum(@PathVariable UUID albumId) {
        albumService.deleteAlbum(albumId);
        return ApiResponse.<Void>builder().message("Album deleted.").build();
    }

    @PostMapping("/{albumId}/songs/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> addSong(
            @PathVariable UUID albumId, @PathVariable UUID songId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.addSong(albumId, songId)).build();
    }

    @DeleteMapping("/{albumId}/songs/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> removeSong(
            @PathVariable UUID albumId, @PathVariable UUID songId) {
        albumService.removeSong(albumId, songId);
        return ApiResponse.<Void>builder().message("Song removed.").build();
    }

    @PatchMapping("/{albumId}/songs/{albumSongId}/reorder")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> reorderSong(
            @PathVariable UUID albumId,
            @PathVariable UUID albumSongId,
            @RequestParam int newOrderIndex) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.reorderSong(albumId, albumSongId, newOrderIndex))
                .build();
    }

    @PostMapping("/{albumId}/submit")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> submitForReview(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.submitForReview(albumId))
                .message("Album submitted for review.").build();
    }

    @PostMapping("/{albumId}/publish")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> publishAlbum(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.publishAlbum(albumId))
                .message("Album is now public.").build();
    }

    @PostMapping("/{albumId}/schedule")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> schedulePublish(
            @PathVariable UUID albumId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            ZonedDateTime scheduledPublishAt) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.schedulePublish(albumId, scheduledPublishAt))
                .message("Album scheduled to publish at " + scheduledPublishAt)
                .build();
    }

    @DeleteMapping("/{albumId}/schedule")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AlbumResponse> cancelSchedule(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.cancelSchedule(albumId))
                .message("Schedule cancelled.").build();
    }
}