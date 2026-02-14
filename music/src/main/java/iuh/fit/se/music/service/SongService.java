package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;

import java.util.UUID;

public interface SongService {
    SongResponse requestUploadUrl(SongCreateRequest request);
    void confirmUpload(UUID songId);
}