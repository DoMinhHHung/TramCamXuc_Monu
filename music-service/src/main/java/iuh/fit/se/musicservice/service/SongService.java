package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.enums.SongStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SongService {

    SongResponse requestUploadUrl(SongCreateRequest request);

    void confirmUpload(UUID songId);

    SongResponse updateSong(UUID songId, SongUpdateRequest request);
    void deleteSong(UUID songId);
    Page<SongResponse> getMySongs(Pageable pageable);
    String getDownloadUrl(UUID songId);

    // ── Public ─────────────────────────────────────────────────────────────────
    SongResponse getSongById(UUID songId);
    String getStreamUrl(UUID songId);
    void recordPlay(UUID songId);
    void recordListen(UUID songId, UUID playlistId, UUID albumId, int durationSeconds);
    Page<SongResponse> searchSongs(String keyword, UUID genreId, UUID artistId, Pageable pageable);
    Page<SongResponse> getTrending(Pageable pageable);
    Page<SongResponse> getNewest(Pageable pageable);
    Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable);

    // ── Admin ──────────────────────────────────────────────────────────────────
    Page<SongResponse> getAdminSongs(String keyword, SongStatus status,
                                     boolean showDeleted, Pageable pageable);

    SongResponse softDeleteSong(UUID songId, String reason);

    SongResponse restoreSong(UUID songId);
}