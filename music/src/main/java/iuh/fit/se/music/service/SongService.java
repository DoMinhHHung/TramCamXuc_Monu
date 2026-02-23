package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import org.springframework.data.domain.*;

import java.util.UUID;

public interface SongService {
    SongResponse requestUploadUrl(SongCreateRequest request);
    void confirmUpload(UUID songId);
    String getDownloadUrl(UUID songId);

    SongResponse getSongById(UUID songId);

    String getStreamUrl(UUID songId);

    void recordPlay(UUID songId);

    Page<SongResponse> searchSongs(String keyword, UUID genreId, UUID artistId, Pageable pageable);

    Page<SongResponse> getTrending(Pageable pageable);

    Page<SongResponse> getNewest(Pageable pageable);

    Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable);
}