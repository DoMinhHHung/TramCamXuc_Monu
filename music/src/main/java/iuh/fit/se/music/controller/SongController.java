package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.request.SongUpdateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.service.SongService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/songs")
@RequiredArgsConstructor
public class SongController {

    private final SongService songService;

    // ==================== PUBLIC ====================

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

    @GetMapping("/trending")
    public ApiResponse<Page<SongResponse>> getTrending(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getTrending(PageRequest.of(page - 1, size)))
                .build();
    }

    @GetMapping("/newest")
    public ApiResponse<Page<SongResponse>> getNewest(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getNewest(PageRequest.of(page - 1, size)))
                .build();
    }

    @GetMapping("/{songId}")
    public ApiResponse<SongResponse> getSongById(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.getSongById(songId))
                .build();
    }

    @PostMapping("/{songId}/play")
    public ApiResponse<Void> recordPlay(@PathVariable UUID songId) {
        songService.recordPlay(songId);
        return ApiResponse.<Void>builder().message("Play recorded.").build();
    }

    // ==================== AUTHENTICATED ====================

    @GetMapping("/{songId}/stream")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getStreamUrl(@PathVariable UUID songId) {
        return ApiResponse.<String>builder()
                .result(songService.getStreamUrl(songId))
                .build();
    }

    @GetMapping("/{songId}/download")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getDownloadUrl(@PathVariable UUID songId) {
        return ApiResponse.<String>builder()
                .result(songService.getDownloadUrl(songId))
                .message("Link tải nhạc sống trong 5 phút.")
                .build();
    }

    // ==================== ARTIST ====================

    @GetMapping("/my-songs")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Page<SongResponse>> getMySongs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getMySONGs(pageable))
                .build();
    }

    @PostMapping("/request-upload")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> requestUploadUrl(@RequestBody @Valid SongCreateRequest request) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.requestUploadUrl(request))
                .build();
    }

    @PostMapping("/{songId}/confirm")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> confirmUpload(@PathVariable UUID songId) {
        songService.confirmUpload(songId);
        return ApiResponse.<Void>builder()
                .message("Upload confirmed. Transcoding started.")
                .build();
    }

    @PutMapping("/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> updateSong(
            @PathVariable UUID songId,
            @RequestBody @Valid SongUpdateRequest request) {

        return ApiResponse.<SongResponse>builder()
                .result(songService.updateSong(songId, request))
                .build();
    }

    @DeleteMapping("/{songId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> deleteSong(@PathVariable UUID songId) {
        songService.deleteSong(songId);
        return ApiResponse.<Void>builder()
                .message("Song deleted successfully.")
                .build();
    }

    @PostMapping("/{songId}/submit")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> submitSong(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.submitSong(songId))
                .message("Song submitted for review.")
                .build();
    }
}