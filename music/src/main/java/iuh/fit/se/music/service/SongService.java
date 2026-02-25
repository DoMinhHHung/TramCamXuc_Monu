package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.*;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.enums.ApprovalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SongService {

    // Artist
    SongResponse requestUploadUrl(SongCreateRequest request);
    void confirmUpload(UUID songId);
    SongResponse updateSong(UUID songId, SongUpdateRequest request);
    void deleteSong(UUID songId);
    Page<SongResponse> getMySONGs(Pageable pageable);
    String getDownloadUrl(UUID songId);
    SongResponse submitSong(UUID songId);

    // Public
    SongResponse getSongById(UUID songId);
    String getStreamUrl(UUID songId);
    void recordPlay(UUID songId);
    Page<SongResponse> searchSongs(String keyword, UUID genreId, UUID artistId, Pageable pageable);
    Page<SongResponse> getTrending(Pageable pageable);
    Page<SongResponse> getNewest(Pageable pageable);
    Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable);

    void recordListen(UUID songId, UUID playlistId, UUID albumId, int durationSeconds);

    // Admin
    Page<SongResponse> getAdminQueue(ApprovalStatus approvalStatus, String keyword, Pageable pageable);
    SongResponse approveSong(UUID songId, UUID adminId);
    SongResponse rejectSong(UUID songId, UUID adminId, SongApprovalRequest request);
}