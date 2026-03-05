package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.enums.AlbumStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.AlbumRepository;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.service.AlbumService;
import iuh.fit.se.musicservice.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlbumServiceImpl implements AlbumService {
    private final AlbumRepository albumRepository;
    private final ArtistRepository artistRepository;

    @Override
    @Transactional
    public AlbumResponse create(AlbumCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        Album album = Album.builder()
                .title(request.getTitle())
                .slug(toSlug(request.getTitle()))
                .description(request.getDescription())
                .coverUrl(request.getCoverUrl())
                .releaseDate(request.getReleaseDate())
                .scheduledPublishAt(request.getScheduledPublishAt())
                .status(request.getStatus() == null ? AlbumStatus.PRIVATE : request.getStatus())
                .ownerArtist(artist)
                .build();

        return toResponse(albumRepository.save(album));
    }

    @Override
    @Transactional
    public AlbumResponse update(UUID albumId, AlbumUpdateRequest request) {
        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));

        UUID userId = SecurityUtils.getCurrentUserId();
        if (!album.getOwnerArtist().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.ALBUM_UNAUTHORIZED);
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            album.setTitle(request.getTitle());
            album.setSlug(toSlug(request.getTitle()));
        }
        if (request.getDescription() != null) album.setDescription(request.getDescription());
        if (request.getCoverUrl() != null) album.setCoverUrl(request.getCoverUrl());
        if (request.getReleaseDate() != null) album.setReleaseDate(request.getReleaseDate());
        if (request.getScheduledPublishAt() != null) album.setScheduledPublishAt(request.getScheduledPublishAt());
        if (request.getStatus() != null) album.setStatus(request.getStatus());

        return toResponse(albumRepository.save(album));
    }

    @Override
    public AlbumResponse getById(UUID albumId) {
        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        return toResponse(album);
    }

    private AlbumResponse toResponse(Album album) {
        return AlbumResponse.builder()
                .id(album.getId())
                .title(album.getTitle())
                .slug(album.getSlug())
                .description(album.getDescription())
                .coverUrl(album.getCoverUrl())
                .releaseDate(album.getReleaseDate())
                .scheduledPublishAt(album.getScheduledPublishAt())
                .status(album.getStatus())
                .totalSongs(album.getAlbumSongs() == null ? 0 : album.getAlbumSongs().size())
                .totalDurationSeconds(album.getTotalDurationSeconds())
                .createdAt(album.getCreatedAt())
                .updatedAt(album.getUpdatedAt())
                .ownerArtistId(album.getOwnerArtist().getId())
                .ownerArtistName(album.getOwnerArtist().getStageName())
                .ownerArtistAvatar(album.getOwnerArtist().getAvatarUrl())
                .build();
    }

    private String toSlug(String raw) {
        return raw.toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
