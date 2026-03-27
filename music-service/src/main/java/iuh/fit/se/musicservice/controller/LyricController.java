package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.LyricResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.LyricService;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LyricController {

    private final LyricService lyricService;
    private final SongService  songService;

    @PostMapping(value = "/songs/{songId}/lyrics",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<LyricResponse> uploadLyric(
            @PathVariable UUID songId,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.<LyricResponse>builder()
                .result(lyricService.uploadLyric(songId, file))
                .message("Lyric uploaded successfully.")
                .build();
    }

    @GetMapping("/songs/{songId}/lyrics")
    public ApiResponse<LyricResponse> getLyric(@PathVariable UUID songId) {
        return ApiResponse.<LyricResponse>builder()
                .result(lyricService.getLyric(songId))
                .build();
    }

    @DeleteMapping("/songs/{songId}/lyrics")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> deleteLyric(@PathVariable UUID songId) {
        lyricService.deleteLyric(songId);
        return ApiResponse.<Void>builder()
                .message("Lyric deleted.")
                .build();
    }

    @GetMapping("/songs/search-by-lyric")
    public ApiResponse<List<SongResponse>> searchByLyric(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {

        int offset = (page - 1) * size;
        List<UUID> songIds = lyricService.searchSongsByLyric(keyword, size, offset);

        if (songIds.isEmpty()) {
            return ApiResponse.<List<SongResponse>>builder()
                    .result(Collections.emptyList())
                    .build();
        }

        List<SongResponse> songs = songService.getSongsByIds(songIds);
        return ApiResponse.<List<SongResponse>>builder()
                .result(songs)
                .build();
    }
}