package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumReorderRequest;
import iuh.fit.se.musicservice.dto.request.AlbumScheduleCommitRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public interface AlbumService {

    // ── Artist: CRUD ───────────────────────────────────────────────────────────

    AlbumResponse createAlbum(AlbumCreateRequest request);

    AlbumResponse updateAlbum(UUID albumId, AlbumUpdateRequest request);

    void deleteAlbum(UUID albumId);

    /** Danh sách album của artist đang đăng nhập */
    Page<AlbumResponse> getMyAlbums(Pageable pageable);

    List<AlbumResponse> getMyAlbumsContainingSong(UUID songId);

    /** Chi tiết album kèm danh sách bài hát theo thứ tự linked list */
    AlbumResponse getAlbumDetail(UUID albumId);

    // ── Artist: Song management ────────────────────────────────────────────────

    AlbumResponse addSongToAlbum(UUID albumId, UUID songId);

    AlbumResponse removeSongFromAlbum(UUID albumId, UUID songId);

    /** Drag-and-drop reorder — O(1) linked list update */
    AlbumResponse reorderSong(UUID albumId, AlbumReorderRequest request);

    // ── Artist: Publishing ─────────────────────────────────────────────────────

    AlbumResponse publishAlbum(UUID albumId);

    AlbumResponse unpublishAlbum(UUID albumId);

    /** Lên lịch tự động publish (query param — tương thích cũ) */
    AlbumResponse schedulePublish(UUID albumId, ZonedDateTime scheduledAt);

    /** Xác nhận lịch phát hành + credits (body JSON) */
    AlbumResponse commitSchedule(UUID albumId, AlbumScheduleCommitRequest request);

    AlbumResponse cancelScheduledPublish(UUID albumId);

    // ── Public ─────────────────────────────────────────────────────────────────

    Page<AlbumResponse> getPublicAlbums(String artistId, Pageable pageable);

    AlbumResponse getPublicAlbumDetail(UUID albumId);

    Page<AlbumResponse> getRecentlyPublishedAlbums(Pageable pageable, int withinDays);

    void favoriteAlbum(UUID albumId);

    void unfavoriteAlbum(UUID albumId);

    boolean isAlbumFavoritedByMe(UUID albumId);

    // ── Admin ─────────────────────────────────────────────────────────────────

    Page<AlbumResponse> adminRecentlyPublishedAlbums(Pageable pageable, int withinDays);

    List<AlbumResponse> adminTopFavoritedAlbumsThisWeek(int limit);

    List<AlbumResponse> adminTopFavoritedAlbumsThisMonth(int limit);
}
