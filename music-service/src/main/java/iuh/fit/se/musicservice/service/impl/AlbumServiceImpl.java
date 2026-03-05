package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.dto.response.AlbumSongResponse;
import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.entity.AlbumSong;
import iuh.fit.se.musicservice.enums.AlbumStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.AlbumRepository;
import iuh.fit.se.musicservice.service.AlbumService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service implementation for Album operations.
 * Decoupled from identity-service - uses ownerArtistId instead of Artist entity.
 * No approval flow - albums are directly available after publishing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlbumServiceImpl implements AlbumService {

    private final AlbumRepository albumRepository;

    // ==================== PUBLIC ENDPOINTS ====================

    @Override
    public AlbumResponse getAlbumById(UUID albumId) {
        Album album = albumRepository.findActiveById(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        return mapToResponse(album);
    }

    @Override
    public AlbumResponse getAlbumBySlug(String slug) {
        Album album = albumRepository.findBySlug(slug)
                .filter(a -> a.getStatus() != AlbumStatus.DELETED)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        return mapToResponse(album);
    }

    @Override
    public Page<AlbumResponse> searchAlbums(String keyword, Pageable pageable) {
        return albumRepository.searchByKeyword(keyword, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<AlbumResponse> getAlbumsByArtist(String artistId, Pageable pageable) {
        return albumRepository.findPublicByArtistId(artistId, pageable)
                .map(this::mapToResponse);
    }

    // ==================== ADMIN ENDPOINTS ====================

    @Override
    @Transactional
    public void adminSoftDeleteAlbum(UUID albumId, String adminId, String reason) {
        log.info("Admin {} is soft-deleting album {} with reason: {}", adminId, albumId, reason);

        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));

        if (album.getStatus() == AlbumStatus.DELETED) {
            log.warn("Album {} is already deleted", albumId);
            return;
        }

        // Soft delete the album
        album.setStatus(AlbumStatus.DELETED);
        album.setDeletedAt(LocalDateTime.now());
        album.setDeletedBy(adminId);
        albumRepository.save(album);

        log.info("Successfully soft-deleted album {} by admin {}", albumId, adminId);
    }

    @Override
    public Page<AlbumResponse> getAdminAlbums(Pageable pageable) {
        return albumRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Map Album entity to AlbumResponse DTO.
     * Uses ownerArtistId instead of nested owner object.
     */
    private AlbumResponse mapToResponse(Album album) {
        List<AlbumSongResponse> songResponses = album.getAlbumSongs().stream()
                .map(this::mapAlbumSongToResponse)
                .collect(Collectors.toList());

        return AlbumResponse.builder()
                .id(album.getId())
                .title(album.getTitle())
                .slug(album.getSlug())
                .description(album.getDescription())
                .coverUrl(album.getCoverUrl())
                .releaseDate(album.getReleaseDate())
                .scheduledPublishAt(album.getScheduledPublishAt())
                .status(album.getStatus())
                .totalSongs(album.getAlbumSongs().size())
                .totalDurationSeconds(album.getTotalDurationSeconds())
                .ownerArtistId(album.getOwnerArtistId())
                .songs(songResponses)
                .createdAt(album.getCreatedAt())
                .updatedAt(album.getUpdatedAt())
                .build();
    }

    private AlbumSongResponse mapAlbumSongToResponse(AlbumSong albumSong) {
        return AlbumSongResponse.builder()
                .id(albumSong.getId())
                .songId(albumSong.getSong().getId())
                .songTitle(albumSong.getSong().getTitle())
                .songSlug(albumSong.getSong().getSlug())
                .songThumbnailUrl(albumSong.getSong().getThumbnailUrl())
                .songDurationSeconds(albumSong.getSong().getDurationSeconds())
                .orderIndex(albumSong.getOrderIndex())
                .addedAt(albumSong.getAddedAt())
                .build();
    }
}
