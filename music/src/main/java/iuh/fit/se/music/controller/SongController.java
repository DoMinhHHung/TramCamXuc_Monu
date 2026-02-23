package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.service.SongService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/songs")
@RequiredArgsConstructor
public class SongController {

    private final SongService songService;

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