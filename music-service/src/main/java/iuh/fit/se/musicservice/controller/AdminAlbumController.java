package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.service.AlbumService;
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
 * Admin controller for album management.
 * Provides endpoints for administrators to manage reported albums.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/albums")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAlbumController {

    private final AlbumService albumService;

    /**
     * Get all albums for admin (including non-active)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AlbumResponse>>> getAllAlbums(Pageable pageable) {
        log.info("Admin getting all albums, page: {}", pageable.getPageNumber());
        Page<AlbumResponse> albums = albumService.getAdminAlbums(pageable);
        return ResponseEntity.ok(ApiResponse.<Page<AlbumResponse>>builder()
                .result(albums)
                .message("Albums retrieved successfully")
                .build());
    }

    /**
     * Soft-delete an album (for reported content).
     *
     * @param albumId The ID of the album to delete
     * @param reason Optional reason for deletion
     */
    @DeleteMapping("/{albumId}")
    public ResponseEntity<ApiResponse<Void>> deleteAlbum(
            @PathVariable UUID albumId,
            @RequestParam(required = false, defaultValue = "Reported content") String reason) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminId = auth.getName();
        
        log.info("Admin {} is deleting album {} with reason: {}", adminId, albumId, reason);
        albumService.adminSoftDeleteAlbum(albumId, adminId, reason);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Album deleted successfully")
                .build());
    }
}
