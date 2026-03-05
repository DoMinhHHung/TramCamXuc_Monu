package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Admin controller for song management.
 * Provides endpoints for administrators to manage reported songs.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/songs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSongController {

    private final SongService songService;

    /**
     * Get all songs for admin (including non-active)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SongResponse>>> getAllSongs(Pageable pageable) {
        log.info("Admin getting all songs, page: {}", pageable.getPageNumber());
        Page<SongResponse> songs = songService.getAdminSongs(pageable);
        return ResponseEntity.ok(ApiResponse.<Page<SongResponse>>builder()
                .result(songs)
                .message("Songs retrieved successfully")
                .build());
    }

    /**
     * Soft-delete a song (for reported content).
     * - Changes status to DELETED
     * - Removes from playlists and albums
     * - Deletes files from MinIO storage
     * - Publishes SONG_SOFT_DELETED event to RabbitMQ
     *
     * @param songId The ID of the song to delete
     * @param reason Optional reason for deletion (e.g., "Reported by users", "Copyright violation")
     */
    @DeleteMapping("/{songId}")
    public ResponseEntity<ApiResponse<Void>> deleteSong(
            @PathVariable UUID songId,
            @RequestParam(required = false, defaultValue = "Reported content") String reason) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminId = auth.getName();
        
        log.info("Admin {} is deleting song {} with reason: {}", adminId, songId, reason);
        songService.adminSoftDeleteSong(songId, adminId, reason);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Song deleted successfully")
                .build());
    }
}
