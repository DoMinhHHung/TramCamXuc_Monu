package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.PlaylistCreateRequest;
import iuh.fit.se.music.dto.request.PlaylistUpdateRequest;
import iuh.fit.se.music.dto.request.ReorderRequest;
import iuh.fit.se.music.dto.response.PlaylistResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface PlaylistService {

    // CRUD — chỉ OWNER
    PlaylistResponse createPlaylist(PlaylistCreateRequest request);
    PlaylistResponse updatePlaylist(UUID playlistId, PlaylistUpdateRequest request);
    void deletePlaylist(UUID playlistId);
    PlaylistResponse uploadCover(UUID playlistId, MultipartFile file);

    // View
    PlaylistResponse getBySlug(String slug);
    Page<PlaylistResponse> getMyPlaylists(Pageable pageable);

    // Songs — chỉ OWNER
    PlaylistResponse addSong(UUID playlistId, UUID songId);
    void removeSong(UUID playlistId, UUID songId);
    PlaylistResponse reorder(UUID playlistId, ReorderRequest request);
}