package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AdminSongBriefResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.enums.SongStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface SongService {

    // ── Artist ────────────────────────────────────────────────────────────────
    /** Tạo record + trả về presigned URL để artist upload file trực tiếp lên MinIO */
    SongResponse requestUploadUrl(SongCreateRequest request);

    /** Artist xác nhận đã upload xong → kích hoạt job transcode */
    void confirmUpload(UUID songId);

    SongResponse updateSong(UUID songId, SongUpdateRequest request);
    void deleteSong(UUID songId);
    Page<SongResponse> getMySongs(Pageable pageable);

    /** Chi tiết bài hát của owner (mọi status, kể cả ALBUM_ONLY). */
    SongResponse getMySongById(UUID songId);

    String getDownloadUrl(UUID songId);

    // ── Public ─────────────────────────────────────────────────────────────────
    SongResponse getSongById(UUID songId);
    String getStreamUrl(UUID songId);
    void recordPlay(UUID songId);
    void recordListen(UUID songId, UUID playlistId, UUID albumId, int durationSeconds, boolean completed);
    Page<SongResponse> searchSongs(String keyword, UUID genreId, UUID artistId, Pageable pageable);
    Page<SongResponse> getTrending(Pageable pageable);
    Page<SongResponse> getNewest(Pageable pageable);
    Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable);

    /** Batch fetch by IDs — dùng cho recommendation-service */
    List<SongResponse> getSongsByIds(List<UUID> ids);

    /** Top bài hát của artist — dùng cho recommendation-service, có cache */
    List<SongResponse> getSongsByArtistTop(UUID artistId, int limit);

    // ── Admin ──────────────────────────────────────────────────────────────────
    Page<SongResponse> getAdminSongs(String keyword, SongStatus status,
                                     boolean showDeleted, Pageable pageable);

    /** Soft-delete bài hát vi phạm */
    SongResponse softDeleteSong(UUID songId, String reason);

    /** Khôi phục bài hát bị xóa nhầm */
    SongResponse restoreSong(UUID songId);

    /** Admin: tra cứu nhanh theo danh sách id (giữ thứ tự, tối đa 200) */
    List<AdminSongBriefResponse> adminBatchLookup(List<UUID> ids);
}
