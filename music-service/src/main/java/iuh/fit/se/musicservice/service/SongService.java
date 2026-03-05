package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SongService {
    SongResponse create(SongCreateRequest request);
    SongResponse update(UUID songId, SongUpdateRequest request);
    SongResponse getById(UUID songId);
    Page<SongResponse> getPublicSongs(Pageable pageable);
}
