package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.SongService;
import iuh.fit.se.musicservice.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SongServiceImpl implements SongService {
    private final SongRepository songRepository;
    private final ArtistRepository artistRepository;

    @Override
    @Transactional
    public SongResponse create(SongCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        Song song = Song.builder()
                .title(request.getTitle())
                .slug(toSlug(request.getTitle()))
                .genres(request.getGenres())
                .status(SongStatus.PRIVATE)
                .primaryArtist(artist)
                .build();

        return toResponse(songRepository.save(song));
    }

    @Override
    @Transactional
    public SongResponse update(UUID songId, SongUpdateRequest request) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        UUID userId = SecurityUtils.getCurrentUserId();
        if (!song.getPrimaryArtist().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.SONG_UNAUTHORIZED_ACCESS);
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            song.setTitle(request.getTitle());
            song.setSlug(toSlug(request.getTitle()));
        }
        if (request.getGenres() != null && !request.getGenres().isEmpty()) {
            song.setGenres(request.getGenres());
        }
        if (request.getStatus() != null) {
            song.setStatus(request.getStatus());
        }
        return toResponse(songRepository.save(song));
    }

    @Override
    public SongResponse getById(UUID songId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));
        return toResponse(song);
    }

    @Override
    public Page<SongResponse> getPublicSongs(Pageable pageable) {
        return songRepository.findByStatus(SongStatus.PUBLIC, pageable).map(this::toResponse);
    }

    private SongResponse toResponse(Song song) {
        return SongResponse.builder()
                .id(song.getId())
                .title(song.getTitle())
                .slug(song.getSlug())
                .thumbnailUrl(song.getThumbnailUrl())
                .durationSeconds(song.getDurationSeconds())
                .playCount(song.getPlayCount())
                .status(song.getStatus())
                .transcodeStatus(song.getTranscodeStatus())
                .streamUrl(song.getHlsMasterUrl())
                .genres(song.getGenres())
                .createdAt(song.getCreatedAt())
                .updatedAt(song.getUpdatedAt())
                .primaryArtist(SongResponse.ArtistSummary.builder()
                        .id(song.getPrimaryArtist().getId())
                        .userId(song.getPrimaryArtist().getUserId())
                        .stageName(song.getPrimaryArtist().getStageName())
                        .avatarUrl(song.getPrimaryArtist().getAvatarUrl())
                        .build())
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
