package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Public controller for song access.
 * Provides read-only endpoints for songs.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/songs")
@RequiredArgsConstructor
public class SongController {

    private final SongService songService;

    /**
     * Get a song by ID
     */
    @GetMapping("/{songId}")
    public ResponseEntity<ApiResponse<SongResponse>> getSongById(@PathVariable UUID songId) {
        log.debug("Getting song by ID: {}", songId);
        SongResponse song = songService.getSongById(songId);
        return ResponseEntity.ok(ApiResponse.<SongResponse>builder()
                .result(song)
                .message("Song retrieved successfully")
                .build());
    }

    /**
     * Get a song by slug
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<SongResponse>> getSongBySlug(@PathVariable String slug) {
        log.debug("Getting song by slug: {}", slug);
        SongResponse song = songService.getSongBySlug(slug);
        return ResponseEntity.ok(ApiResponse.<SongResponse>builder()
                .result(song)
                .message("Song retrieved successfully")
                .build());
    }

    /**
     * Search songs by keyword
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<SongResponse>>> searchSongs(
            @RequestParam String keyword,
            Pageable pageable) {
        log.debug("Searching songs with keyword: {}", keyword);
        Page<SongResponse> songs = songService.searchSongs(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<SongResponse>>builder()
                .result(songs)
                .message("Songs retrieved successfully")
                .build());
    }

    /**
     * Get trending songs
     */
    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<Page<SongResponse>>> getTrending(Pageable pageable) {
        log.debug("Getting trending songs");
        Page<SongResponse> songs = songService.getTrending(pageable);
        return ResponseEntity.ok(ApiResponse.<Page<SongResponse>>builder()
                .result(songs)
                .message("Trending songs retrieved successfully")
                .build());
    }

    /**
     * Get newest songs
     */
    @GetMapping("/newest")
    public ResponseEntity<ApiResponse<Page<SongResponse>>> getNewest(Pageable pageable) {
        log.debug("Getting newest songs");
        Page<SongResponse> songs = songService.getNewest(pageable);
        return ResponseEntity.ok(ApiResponse.<Page<SongResponse>>builder()
                .result(songs)
                .message("Newest songs retrieved successfully")
                .build());
    }

    /**
     * Get songs by artist ID
     */
    @GetMapping("/artist/{artistId}")
    public ResponseEntity<ApiResponse<Page<SongResponse>>> getSongsByArtist(
            @PathVariable String artistId,
            Pageable pageable) {
        log.debug("Getting songs by artist: {}", artistId);
        Page<SongResponse> songs = songService.getSongsByArtist(artistId, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<SongResponse>>builder()
                .result(songs)
                .message("Songs retrieved successfully")
                .build());
    }

    /**
     * Get stream URL for a song
     */
    @GetMapping("/{songId}/stream")
    public ResponseEntity<ApiResponse<String>> getStreamUrl(@PathVariable UUID songId) {
        log.debug("Getting stream URL for song: {}", songId);
        String streamUrl = songService.getStreamUrl(songId);
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .result(streamUrl)
                .message("Stream URL retrieved successfully")
                .build());
    }
}
