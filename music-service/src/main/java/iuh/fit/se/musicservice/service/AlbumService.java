package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;

import java.util.UUID;

public interface AlbumService {
    AlbumResponse create(AlbumCreateRequest request);
    AlbumResponse update(UUID albumId, AlbumUpdateRequest request);
    AlbumResponse getById(UUID albumId);
}
