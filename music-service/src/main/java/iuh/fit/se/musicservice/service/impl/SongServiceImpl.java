package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.event.SongSoftDeletedEvent;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.helper.MinioHelper;
import iuh.fit.se.musicservice.repository.AlbumSongRepository;
import iuh.fit.se.musicservice.repository.PlaylistSongRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service implementation for Song operations.
 * Decoupled from identity-service - uses artistId instead of Artist entity.
 * No approval flow - songs are directly available after transcoding.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SongServiceImpl implements SongService {

    private final SongRepository songRepository;
    private final AlbumSongRepository albumSongRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final MinioHelper minioHelper;
    private final RabbitTemplate rabbitTemplate;

    @Value("${minio.public-url}")
    private String minioPublicUrl;

    @Value("${minio.bucket.public-songs}")
    private String publicSongsBucket;

    // ==================== PUBLIC ENDPOINTS ====================

    @Override
    public SongResponse getSongById(UUID songId) {
        Song song = songRepository.findActiveById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));
        return mapToResponse(song);
    }

    @Override
    public SongResponse getSongBySlug(String slug) {
        Song song = songRepository.findBySlug(slug)
                .filter(s -> s.getStatus() == SongStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));
        return mapToResponse(song);
    }

    @Override
    public Page<SongResponse> searchSongs(String keyword, Pageable pageable) {
        return songRepository.searchByKeyword(keyword, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<SongResponse> getTrending(Pageable pageable) {
        return songRepository.findTrending(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<SongResponse> getNewest(Pageable pageable) {
        return songRepository.findNewest(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<SongResponse> getSongsByArtist(String artistId, Pageable pageable) {
        return songRepository.findActiveByArtistId(artistId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public String getStreamUrl(UUID songId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (song.getStatus() == SongStatus.DELETED) {
            throw new AppException(ErrorCode.SONG_NOT_FOUND);
        }

        if (song.getTranscodeStatus() != TranscodeStatus.COMPLETED) {
            throw new AppException(ErrorCode.SONG_NOT_READY);
        }

        if (song.getHlsMasterUrl() == null) {
            throw new AppException(ErrorCode.SONG_NOT_READY);
        }

        // Build stream URL - default to 128k quality
        // TODO: Implement quality selection based on user subscription via FeignClient
        String quality = "128k";
        return buildStreamUrl(song, quality);
    }

    // ==================== ADMIN ENDPOINTS ====================

    @Override
    @Transactional
    public void adminSoftDeleteSong(UUID songId, String adminId, String reason) {
        log.info("Admin {} is soft-deleting song {} with reason: {}", adminId, songId, reason);

        // 1. Find the song
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (song.getStatus() == SongStatus.DELETED) {
            log.warn("Song {} is already deleted", songId);
            return;
        }

        String artistId = song.getArtistId();
        LocalDateTime deletedAt = LocalDateTime.now();

        // 2. Update song status to DELETED (soft delete)
        song.setStatus(SongStatus.DELETED);
        song.setDeletedAt(deletedAt);
        song.setDeletedBy(adminId);
        songRepository.save(song);
        log.info("Song {} status changed to DELETED", songId);

        // 3. Remove song from all playlists
        try {
            playlistSongRepository.deleteBySongId(songId);
            log.info("Removed song {} from all playlists", songId);
        } catch (Exception e) {
            log.error("Failed to remove song {} from playlists: {}", songId, e.getMessage());
            // Don't rollback - continue with deletion
        }

        // 4. Remove song from all albums
        try {
            albumSongRepository.deleteBySongId(songId);
            log.info("Removed song {} from all albums", songId);
        } catch (Exception e) {
            log.error("Failed to remove song {} from albums: {}", songId, e.getMessage());
            // Don't rollback - continue with deletion
        }

        // 5. Delete files from MinIO storage (wrapped in try-catch, don't rollback on failure)
        try {
            minioHelper.deleteSongFiles(
                    song.getRawFileKey(),
                    song.getThumbnailUrl(),
                    song.getHlsFolderKey()
            );
            log.info("Deleted MinIO files for song {}", songId);
        } catch (Exception e) {
            log.error("Failed to delete MinIO files for song {}: {}. DB transaction will NOT rollback.", 
                    songId, e.getMessage());
            // Do not rollback the database transaction on MinIO failure
        }

        // 6. Publish SONG_SOFT_DELETED event to RabbitMQ
        try {
            SongSoftDeletedEvent event = SongSoftDeletedEvent.builder()
                    .songId(songId)
                    .artistId(artistId)
                    .adminId(adminId)
                    .deletedAt(deletedAt)
                    .reason(reason)
                    .build();

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.MUSIC_EVENT_EXCHANGE,
                    RabbitMQConfig.SONG_SOFT_DELETED_ROUTING_KEY,
                    event
            );
            log.info("Published SONG_SOFT_DELETED event for song {}", songId);
        } catch (Exception e) {
            log.error("Failed to publish SONG_SOFT_DELETED event for song {}: {}. " +
                    "Other services may not be notified.", songId, e.getMessage());
            // Do not rollback - the deletion is still valid
        }

        log.info("Successfully soft-deleted song {} by admin {}", songId, adminId);
    }

    @Override
    public Page<SongResponse> getAdminSongs(Pageable pageable) {
        return songRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    // ==================== HELPER METHODS ====================

    private String buildStreamUrl(Song song, String quality) {
        String hlsDir = song.getHlsMasterUrl().replace("/master.m3u8", "");
        String variantKey = hlsDir + "/stream_" + quality + ".m3u8";
        return String.format("%s/%s/%s", minioPublicUrl, publicSongsBucket, variantKey);
    }

    /**
     * Map Song entity to SongResponse DTO.
     * Uses artistId instead of nested ArtistSummary object.
     */
    private SongResponse mapToResponse(Song song) {
        SongResponse response = SongResponse.builder()
                .id(song.getId())
                .title(song.getTitle())
                .slug(song.getSlug())
                .thumbnailUrl(song.getThumbnailUrl())
                .durationSeconds(song.getDurationSeconds())
                .playCount(song.getPlayCount())
                .status(song.getStatus())
                .transcodeStatus(song.getTranscodeStatus())
                .genres(song.getGenres())
                .artistId(song.getArtistId())
                .createdAt(song.getCreatedAt())
                .updatedAt(song.getUpdatedAt())
                .build();

        // Set stream URL for active songs that are transcoded
        if (song.getStatus() == SongStatus.ACTIVE && 
            song.getTranscodeStatus() == TranscodeStatus.COMPLETED &&
            song.getHlsMasterUrl() != null) {
            response.setStreamUrl(buildStreamUrl(song, "128k"));
        }

        return response;
    }
}
