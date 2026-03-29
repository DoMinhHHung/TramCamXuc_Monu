package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.PlaylistCreateRequest;
import iuh.fit.se.musicservice.dto.request.PlaylistUpdateRequest;
import iuh.fit.se.musicservice.dto.request.ReorderRequest;
import iuh.fit.se.musicservice.dto.response.PlaylistResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface PlaylistService {
    /**
     * Lưu playlist từ Discovery: tạo bản copy, gắn description đặc biệt, đánh dấu discovery, tăng share count.
     */
    PlaylistResponse saveFromDiscovery(UUID sourcePlaylistId, String sourceAuthorName);

    // ── CRUD — chỉ OWNER ──────────────────────────────────────
    PlaylistResponse createPlaylist(PlaylistCreateRequest request);
    PlaylistResponse updatePlaylist(UUID playlistId, PlaylistUpdateRequest request);
    void deletePlaylist(UUID playlistId);
    PlaylistResponse uploadCover(UUID playlistId, MultipartFile file);

    // ── View ──────────────────────────────────────────────────
    PlaylistResponse getById(UUID playlistId);
    PlaylistResponse getBySlug(String slug);
    Page<PlaylistResponse> getMyPlaylists(Pageable pageable);

    // ── Songs — chỉ OWNER ─────────────────────────────────────
    PlaylistResponse addSong(UUID playlistId, UUID songId);
    void removeSong(UUID playlistId, UUID songId);
    PlaylistResponse reorder(UUID playlistId, ReorderRequest request);
}
