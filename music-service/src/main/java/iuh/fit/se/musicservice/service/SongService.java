package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.SongResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service interface for Song operations.
 * No approval flow - songs go directly to ACTIVE after transcoding.
 */
public interface SongService {

    // ==================== PUBLIC ENDPOINTS ====================

    /**
     * Get a song by ID (only active songs)
     */
    SongResponse getSongById(UUID songId);

    /**
     * Get a song by slug
     */
    SongResponse getSongBySlug(String slug);

    /**
     * Search songs by keyword
     */
    Page<SongResponse> searchSongs(String keyword, Pageable pageable);

    /**
     * Get trending songs (ordered by play count)
     */
    Page<SongResponse> getTrending(Pageable pageable);

    /**
     * Get newest songs
     */
    Page<SongResponse> getNewest(Pageable pageable);

    /**
     * Get songs by artist ID
     */
    Page<SongResponse> getSongsByArtist(String artistId, Pageable pageable);

    /**
     * Get stream URL for a song
     */
    String getStreamUrl(UUID songId);

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin soft-delete a song (for reported content).
     * - Changes status to DELETED
     * - Removes from playlists and albums
     * - Deletes files from MinIO storage
     * - Publishes SONG_SOFT_DELETED event to RabbitMQ
     *
     * @param songId  The ID of the song to delete
     * @param adminId The ID of the admin performing the deletion
     * @param reason  The reason for deletion (e.g., "Reported by users")
     */
    void adminSoftDeleteSong(UUID songId, String adminId, String reason);

    /**
     * Get all songs for admin (including non-active)
     */
    Page<SongResponse> getAdminSongs(Pageable pageable);
}
