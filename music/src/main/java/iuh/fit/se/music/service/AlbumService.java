package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.AlbumApprovalRequest;
import iuh.fit.se.music.dto.request.AlbumCreateRequest;
import iuh.fit.se.music.dto.request.AlbumUpdateRequest;
import iuh.fit.se.music.dto.response.AlbumResponse;
import iuh.fit.se.music.enums.AlbumApprovalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZonedDateTime;
import java.util.UUID;

public interface AlbumService {

    // ── Artist (OWNER only) ────────────────────────────────

    AlbumResponse createAlbum(AlbumCreateRequest request);

    AlbumResponse updateAlbum(UUID albumId, AlbumUpdateRequest request);

    AlbumResponse uploadCover(UUID albumId, MultipartFile file);

    void deleteAlbum(UUID albumId);

    AlbumResponse addSong(UUID albumId, UUID songId);

    void removeSong(UUID albumId, UUID songId);

    AlbumResponse reorderSong(UUID albumId, UUID albumSongId, int newOrderIndex);

    AlbumResponse submitForReview(UUID albumId);

    AlbumResponse publishAlbum(UUID albumId);

    AlbumResponse schedulePublish(UUID albumId, ZonedDateTime scheduledPublishAt);

    AlbumResponse cancelSchedule(UUID albumId);

    AlbumResponse getMyAlbumDetail(UUID albumId);

    Page<AlbumResponse> getMyAlbums(Pageable pageable);

    // ── Public ────────────────────────────────────────────

    AlbumResponse getPublicAlbum(UUID albumId);

    Page<AlbumResponse> getPublicAlbumsByArtist(UUID artistId, Pageable pageable);

    // ── Admin ─────────────────────────────────────────────

    Page<AlbumResponse> getAdminQueue(
            AlbumApprovalStatus approvalStatus, String keyword, Pageable pageable);

    AlbumResponse getAdminAlbumDetail(UUID albumId);

    AlbumResponse approveAlbum(UUID albumId, UUID adminId);

    AlbumResponse rejectAlbum(UUID albumId, UUID adminId, AlbumApprovalRequest request);
}