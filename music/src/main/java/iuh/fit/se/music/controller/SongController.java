package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.service.SongService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/songs")
@RequiredArgsConstructor
public class SongController {

    private final SongService songService;

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

        Pageable pageable = PageRequest.of(page - 1, size);
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getTrending(pageable))
                .build();
    }

    @GetMapping("/newest")
    public ApiResponse<Page<SongResponse>> getNewest(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page - 1, size);
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getNewest(pageable))
                .build();
    }

    @GetMapping("/{songId}")
    public ApiResponse<SongResponse> getSongById(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.getSongById(songId))
                .build();
    }

    @GetMapping("/{songId}/stream")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getStreamUrl(@PathVariable UUID songId) {
        return ApiResponse.<String>builder()
                .result(songService.getStreamUrl(songId))
                .build();
    }

    @PostMapping("/{songId}/play")
    public ApiResponse<Void> recordPlay(@PathVariable UUID songId) {
        songService.recordPlay(songId);
        return ApiResponse.<Void>builder()
                .message("Play recorded.")
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
    public ApiResponse<Void> confirmUpload(@PathVariable("songId") UUID songId) {
        songService.confirmUpload(songId);
        return ApiResponse.<Void>builder()
                .message("Upload confirmed. Transcoding started.")
                .build();
    }

    @GetMapping("/{songId}/download")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getDownloadUrl(@PathVariable("songId") UUID songId) {
        return ApiResponse.<String>builder()
                .result(songService.getDownloadUrl(songId))
                .message("Link tải nhạc sống trong 5 phút.")
                .build();
    }
}