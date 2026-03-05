package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service interface for Album operations.
 * No approval flow - albums go directly to PUBLIC status.
 */
public interface AlbumService {

    // ==================== PUBLIC ENDPOINTS ====================

    /**
     * Get an album by ID (only active albums)
     */
    AlbumResponse getAlbumById(UUID albumId);

    /**
     * Get an album by slug
     */
    AlbumResponse getAlbumBySlug(String slug);

    /**
     * Search albums by keyword
     */
    Page<AlbumResponse> searchAlbums(String keyword, Pageable pageable);

    /**
     * Get albums by artist ID
     */
    Page<AlbumResponse> getAlbumsByArtist(String artistId, Pageable pageable);

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin soft-delete an album (for reported content).
     *
     * @param albumId The ID of the album to delete
     * @param adminId The ID of the admin performing the deletion
     * @param reason  The reason for deletion
     */
    void adminSoftDeleteAlbum(UUID albumId, String adminId, String reason);

    /**
     * Get all albums for admin (including non-active)
     */
    Page<AlbumResponse> getAdminAlbums(Pageable pageable);
}
