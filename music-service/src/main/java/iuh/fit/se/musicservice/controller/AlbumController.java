package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.service.AlbumService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Public controller for album access.
 * Provides read-only endpoints for albums.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/albums")
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    /**
     * Get an album by ID
     */
    @GetMapping("/{albumId}")
    public ResponseEntity<ApiResponse<AlbumResponse>> getAlbumById(@PathVariable UUID albumId) {
        log.debug("Getting album by ID: {}", albumId);
        AlbumResponse album = albumService.getAlbumById(albumId);
        return ResponseEntity.ok(ApiResponse.<AlbumResponse>builder()
                .result(album)
                .message("Album retrieved successfully")
                .build());
    }

    /**
     * Get an album by slug
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<AlbumResponse>> getAlbumBySlug(@PathVariable String slug) {
        log.debug("Getting album by slug: {}", slug);
        AlbumResponse album = albumService.getAlbumBySlug(slug);
        return ResponseEntity.ok(ApiResponse.<AlbumResponse>builder()
                .result(album)
                .message("Album retrieved successfully")
                .build());
    }

    /**
     * Search albums by keyword
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<AlbumResponse>>> searchAlbums(
            @RequestParam String keyword,
            Pageable pageable) {
        log.debug("Searching albums with keyword: {}", keyword);
        Page<AlbumResponse> albums = albumService.searchAlbums(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<AlbumResponse>>builder()
                .result(albums)
                .message("Albums retrieved successfully")
                .build());
    }

    /**
     * Get albums by artist ID
     */
    @GetMapping("/artist/{artistId}")
    public ResponseEntity<ApiResponse<Page<AlbumResponse>>> getAlbumsByArtist(
            @PathVariable String artistId,
            Pageable pageable) {
        log.debug("Getting albums by artist: {}", artistId);
        Page<AlbumResponse> albums = albumService.getAlbumsByArtist(artistId, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<AlbumResponse>>builder()
                .result(albums)
                .message("Albums retrieved successfully")
                .build());
    }
}
