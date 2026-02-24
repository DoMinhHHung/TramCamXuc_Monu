package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.core.service.StorageService;
import iuh.fit.se.music.dto.request.*;
import iuh.fit.se.music.dto.response.*;
import iuh.fit.se.music.entity.*;
import iuh.fit.se.music.enums.*;
import iuh.fit.se.music.repository.*;
import iuh.fit.se.music.service.AlbumService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlbumServiceImpl implements AlbumService {

    private final AlbumRepository albumRepository;
    private final AlbumSongRepository albumSongRepository;
    private final ArtistRepository artistRepository;
    private final SongRepository songRepository;
    private final StorageService storageService;

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private Artist requireActiveArtist() {
        Artist artist = artistRepository.findByUserId(currentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        if (artist.getStatus() != ArtistStatus.ACTIVE)
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        return artist;
    }

    private Album requireOwnerAlbum(UUID albumId) {
        return albumRepository.findByIdAndOwnerUserId(albumId, currentUserId())
                .orElseThrow(() -> {
                    boolean exists = albumRepository.existsById(albumId);
                    if (!exists) {
                        return new AppException(ErrorCode.ALBUM_NOT_FOUND);
                    }
                    return new AppException(ErrorCode.ALBUM_UNAUTHORIZED);
                });
    }

    private String generateSlug(String title, UUID id) {
        try {
            String temp = Normalizer.normalize(title, Normalizer.Form.NFD);
            String slug = Pattern
                    .compile("\\p{InCombiningDiacriticalMarks}+")
                    .matcher(temp).replaceAll("")
                    .toLowerCase()
                    .replaceAll("[^a-z0-9\\s-]", "")
                    .replaceAll("[\\s-]+", "-")
                    .replaceAll("^-|-$", "");
            if (slug.length() > 80) slug = slug.substring(0, 80);
            return slug + "-" + id.toString().substring(0, 8);
        } catch (Exception e) {
            return "album-" + id.toString().substring(0, 8);
        }
    }

    private boolean isSongAvailable(Song song) {
        return song.getStatus()          == SongStatus.PUBLIC
                && song.getApprovalStatus()  == ApprovalStatus.APPROVED
                && song.getTranscodeStatus() == TranscodeStatus.COMPLETED;
    }

    private AlbumSongResponse toAlbumSongResponse(AlbumSong als, boolean isOwner) {
        Song song = als.getSong();
        boolean available = isSongAvailable(song);

        String reason = null;
        if (!available) {
            if      (song.getStatus() == SongStatus.DELETED)
                reason = "Bài hát đã bị xóa";
            else if (song.getTranscodeStatus() != TranscodeStatus.COMPLETED)
                reason = "Đang xử lý âm thanh";
            else if (song.getApprovalStatus() == ApprovalStatus.REJECTED)
                reason = "Bài hát bị từ chối";
            else if (song.getStatus() == SongStatus.ALBUM_ONLY)
                reason = "Album chưa được phát hành";
            else
                reason = "Bài hát hiện không khả dụng";
        }

        Set<GenreResponse> genres = song.getGenres() == null ? null :
                song.getGenres().stream()
                        .map(g -> GenreResponse.builder()
                                .id(g.getId()).name(g.getName())
                                .description(g.getDescription()).build())
                        .collect(Collectors.toSet());

        return AlbumSongResponse.builder()
                .albumSongId(als.getId())
                .orderIndex(als.getOrderIndex())
                .songId(song.getId())
                .title(song.getTitle())
                .slug(available || isOwner ? song.getSlug() : null)
                .thumbnailUrl(song.getThumbnailUrl())
                .durationSeconds(song.getDurationSeconds())
                .playCount(song.getPlayCount())
                .available(available)
                .unavailableReason(isOwner ? reason : null)
                .artistId(song.getPrimaryArtist().getId())
                .artistStageName(song.getPrimaryArtist().getStageName())
                .artistAvatarUrl(song.getPrimaryArtist().getAvatarUrl())
                .genres(genres)
                .build();
    }

    private AlbumResponse toDetailResponse(Album album, boolean isOwner) {
        List<AlbumSongResponse> songs = album.getAlbumSongs().stream()
                .sorted(Comparator.comparingInt(AlbumSong::getOrderIndex))
                .map(als -> toAlbumSongResponse(als, isOwner))
                .filter(r -> isOwner || r.isAvailable())
                .collect(Collectors.toList());

        Artist owner = album.getOwnerArtist();
        return AlbumResponse.builder()
                .id(album.getId()).title(album.getTitle()).slug(album.getSlug())
                .description(album.getDescription()).coverUrl(album.getCoverUrl())
                .releaseDate(album.getReleaseDate())
                .scheduledPublishAt(album.getScheduledPublishAt())
                .approvalStatus(album.getApprovalStatus())
                .visibility(album.getVisibility())
                .rejectionReason(isOwner ? album.getRejectionReason() : null)
                .reviewedAt(album.getReviewedAt())
                .totalSongs(album.getAlbumSongs().size())
                .totalDurationSeconds(album.getTotalDurationSeconds())
                .createdAt(album.getCreatedAt()).updatedAt(album.getUpdatedAt())
                .ownerArtistId(owner.getId())
                .ownerArtistName(owner.getStageName())
                .ownerArtistAvatar(owner.getAvatarUrl())
                .songs(songs)
                .build();
    }

    private AlbumResponse toSummaryResponse(Album album) {
        Artist owner = album.getOwnerArtist();
        return AlbumResponse.builder()
                .id(album.getId()).title(album.getTitle()).slug(album.getSlug())
                .coverUrl(album.getCoverUrl()).releaseDate(album.getReleaseDate())
                .scheduledPublishAt(album.getScheduledPublishAt())
                .approvalStatus(album.getApprovalStatus())
                .visibility(album.getVisibility())
                .totalSongs(album.getAlbumSongs().size())
                .totalDurationSeconds(album.getTotalDurationSeconds())
                .createdAt(album.getCreatedAt()).updatedAt(album.getUpdatedAt())
                .ownerArtistId(owner.getId())
                .ownerArtistName(owner.getStageName())
                .ownerArtistAvatar(owner.getAvatarUrl())
                .songs(null)
                .build();
    }

    private Album reloadOwner(UUID albumId) {
        return albumRepository.findByIdAndOwnerUserId(albumId, currentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
    }

//    @Override
//    @Transactional
//    public AlbumResponse createAlbum(AlbumCreateRequest request) {
//        Artist artist = requireActiveArtist();
//        UUID albumId = UUID.randomUUID();
//
//        Album album = Album.builder()
//                .id(albumId)
//                .title(request.getTitle())
//                .slug(generateSlug(request.getTitle(), albumId))
//                .description(request.getDescription())
//                .ownerArtist(artist)
//                .releaseDate(request.getReleaseDate())
//                .approvalStatus(AlbumApprovalStatus.DRAFT)
//                .visibility(AlbumVisibility.PRIVATE)
//                .totalDurationSeconds(0)
//                .build();
//
//        albumRepository.save(album);
//        log.info("Album {} created by artist {}", albumId, artist.getId());
//        return toDetailResponse(reloadOwner(albumId), true);
//    }
    @Override
    @Transactional
    public AlbumResponse createAlbum(AlbumCreateRequest request) {
        Artist artist = requireActiveArtist();
        UUID albumId = UUID.randomUUID();

        Album album = Album.builder()
                .id(albumId)
                .title(request.getTitle())
                .slug(generateSlug(request.getTitle(), albumId))
                .description(request.getDescription())
                .ownerArtist(artist)
                .releaseDate(request.getReleaseDate())
                .approvalStatus(AlbumApprovalStatus.DRAFT)
                .visibility(AlbumVisibility.PRIVATE)
                .totalDurationSeconds(0)
                .build();

        albumRepository.save(album);
        log.info("Album {} created by artist {}", albumId, artist.getId());

        return toDetailResponse(album, true);
    }

    @Override
    @Transactional
    public AlbumResponse updateAlbum(UUID albumId, AlbumUpdateRequest request) {
        Album album = requireOwnerAlbum(albumId);

        // Được sửa khi DRAFT/REJECTED
        if (album.getApprovalStatus() == AlbumApprovalStatus.PENDING || album.getApprovalStatus() == AlbumApprovalStatus.APPROVED)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        if (request.getTitle() != null && !request.getTitle().isBlank())
            album.setTitle(request.getTitle());
        if (request.getDescription() != null)
            album.setDescription(request.getDescription());
        if (request.getReleaseDate() != null)
            album.setReleaseDate(request.getReleaseDate());

        albumRepository.save(album);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    @Transactional
    public AlbumResponse uploadCover(UUID albumId, MultipartFile file) {
        Album album = requireOwnerAlbum(albumId);
        String key = "album-covers/" + albumId + "/" + file.getOriginalFilename();
        String url = storageService.uploadPublicFile(key, file);
        album.setCoverUrl(url);
        albumRepository.save(album);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    @Transactional
    public void deleteAlbum(UUID albumId) {
        Album album = requireOwnerAlbum(albumId);

        album.getAlbumSongs().stream()
                .map(AlbumSong::getSong)
                .filter(s -> s.getStatus() == SongStatus.ALBUM_ONLY)
                .forEach(s -> {
                    s.setStatus(SongStatus.DRAFT);
                    songRepository.save(s);
                });

        albumRepository.delete(album);
        log.info("Album {} deleted, songs returned to DRAFT", albumId);
    }

    @Override
    @Transactional
    public AlbumResponse addSong(UUID albumId, UUID songId) {
        Artist artist = requireActiveArtist();
        Album album   = requireOwnerAlbum(albumId);

        if (album.getApprovalStatus() == AlbumApprovalStatus.PENDING
                || album.getApprovalStatus() == AlbumApprovalStatus.APPROVED)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        Song song = songRepository
                .findByIdAndArtistUserId(songId, artist.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (song.getTranscodeStatus() != TranscodeStatus.COMPLETED)
            throw new AppException(ErrorCode.SONG_NOT_READY);

        if (song.getStatus() == SongStatus.DELETED
                || song.getStatus() == SongStatus.PRIVATE)
            throw new AppException(ErrorCode.INVALID_REQUEST);

        if (albumSongRepository.existsBySongId(songId))
            throw new AppException(ErrorCode.SONG_ALREADY_IN_ALBUM);

        if (albumSongRepository.existsByAlbumIdAndSongId(albumId, songId))
            throw new AppException(ErrorCode.ALBUM_SONG_ALREADY_EXISTS);

        song.setStatus(SongStatus.ALBUM_ONLY);
        songRepository.save(song);

        int nextOrder = albumSongRepository.findMaxOrderIndex(albumId) + 1;
        albumSongRepository.save(AlbumSong.builder()
                .album(album).song(song).orderIndex(nextOrder).build());

        int dur = song.getDurationSeconds() != null ? song.getDurationSeconds() : 0;
        album.setTotalDurationSeconds(album.getTotalDurationSeconds() + dur);
        albumRepository.save(album);

        log.info("Song {} (ALBUM_ONLY) added to album {} at #{}",
                songId, albumId, nextOrder);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    @Transactional
    public void removeSong(UUID albumId, UUID songId) {
        Album album = requireOwnerAlbum(albumId);

        if (album.getApprovalStatus() == AlbumApprovalStatus.PENDING
                || album.getApprovalStatus() == AlbumApprovalStatus.APPROVED)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        AlbumSong als = albumSongRepository
                .findByAlbumIdAndSongId(albumId, songId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_SONG_NOT_FOUND));

        int removedOrder = als.getOrderIndex();
        Song song = als.getSong();

        albumSongRepository.delete(als);
        albumSongRepository.decrementOrderAfter(albumId, removedOrder);

        if (song.getStatus() == SongStatus.ALBUM_ONLY) {
            song.setStatus(SongStatus.DRAFT);
            songRepository.save(song);
        }

        int dur = song.getDurationSeconds() != null ? song.getDurationSeconds() : 0;
        album.setTotalDurationSeconds(
                Math.max(0, album.getTotalDurationSeconds() - dur));
        albumRepository.save(album);
        log.info("Song {} removed from album {}", songId, albumId);
    }

    @Override @Transactional
    public AlbumResponse reorderSong(UUID albumId, UUID albumSongId, int newOrder) {
        Artist artist = requireActiveArtist();
        requireOwnerAlbum(albumId);

        AlbumSong target = albumSongRepository.findById(albumSongId)
                .filter(a -> a.getAlbum().getId().equals(albumId))
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_SONG_NOT_FOUND));

        int oldOrder = target.getOrderIndex();
        if (oldOrder == newOrder)
            return toDetailResponse(reloadOwner(albumId), true);

        List<AlbumSong> all = albumSongRepository.findByAlbumIdOrdered(albumId);
        if (newOrder < 1 || newOrder > all.size())
            throw new AppException(ErrorCode.INVALID_REQUEST);

        if (newOrder < oldOrder) {
            all.stream()
                    .filter(a -> a.getOrderIndex() >= newOrder
                            && a.getOrderIndex() < oldOrder
                            && !a.getId().equals(albumSongId))
                    .forEach(a -> { a.setOrderIndex(a.getOrderIndex() + 1);
                        albumSongRepository.save(a); });
        } else {
            all.stream()
                    .filter(a -> a.getOrderIndex() > oldOrder
                            && a.getOrderIndex() <= newOrder
                            && !a.getId().equals(albumSongId))
                    .forEach(a -> { a.setOrderIndex(a.getOrderIndex() - 1);
                        albumSongRepository.save(a); });
        }
        target.setOrderIndex(newOrder);
        albumSongRepository.save(target);

        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    @Transactional
    public AlbumResponse submitForReview(UUID albumId) {
        Album album = requireOwnerAlbum(albumId);

        if (album.getApprovalStatus() != AlbumApprovalStatus.DRAFT
                && album.getApprovalStatus() != AlbumApprovalStatus.REJECTED)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        if (album.getAlbumSongs().isEmpty())
            throw new AppException(ErrorCode.ALBUM_SUBMIT_FAILED);

        boolean hasUnfinished = album.getAlbumSongs().stream()
                .anyMatch(a -> a.getSong().getTranscodeStatus() != TranscodeStatus.COMPLETED);
        if (hasUnfinished)
            throw new AppException(ErrorCode.ALBUM_SUBMIT_FAILED);

        boolean hasRejected = album.getAlbumSongs().stream()
                .anyMatch(a -> a.getSong().getApprovalStatus() == ApprovalStatus.REJECTED);
        if (hasRejected)
            throw new AppException(ErrorCode.ALBUM_HAS_REJECTED_SONG);

        album.setApprovalStatus(AlbumApprovalStatus.PENDING);
        album.setRejectionReason(null);
        albumRepository.save(album);
        log.info("Album {} submitted for review", albumId);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    @Transactional
    public AlbumResponse publishAlbum(UUID albumId) {
        Album album = requireOwnerAlbum(albumId);

        if (album.getApprovalStatus() != AlbumApprovalStatus.APPROVED)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);
        if (album.getVisibility() == AlbumVisibility.PUBLIC)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        album.getAlbumSongs().stream()
                .map(AlbumSong::getSong)
                .filter(s -> s.getStatus() == SongStatus.ALBUM_ONLY)
                .forEach(s -> { s.setStatus(SongStatus.PUBLIC); songRepository.save(s); });

        album.setVisibility(AlbumVisibility.PUBLIC);
        album.setScheduledPublishAt(null);
        albumRepository.save(album);
        log.info("Album {} published manually", albumId);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override @Transactional
    public AlbumResponse schedulePublish(UUID albumId, ZonedDateTime scheduledAt) {
        Album album = requireOwnerAlbum(albumId);

        if (album.getApprovalStatus() != AlbumApprovalStatus.APPROVED)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);
        if (album.getVisibility() == AlbumVisibility.PUBLIC)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);
        if (scheduledAt.isBefore(ZonedDateTime.now()))
            throw new AppException(ErrorCode.ALBUM_SCHEDULE_INVALID_TIME);

        album.setScheduledPublishAt(scheduledAt);
        albumRepository.save(album);
        log.info("Album {} scheduled at {}", albumId, scheduledAt);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    @Transactional
    public AlbumResponse cancelSchedule(UUID albumId) {
        Album album = requireOwnerAlbum(albumId);

        if (album.getScheduledPublishAt() == null)
            throw new AppException(ErrorCode.ALBUM_SCHEDULE_NOT_FOUND);
        if (album.getVisibility() == AlbumVisibility.PUBLIC)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        album.setScheduledPublishAt(null);
        albumRepository.save(album);
        log.info("Album {} schedule cancelled", albumId);
        return toDetailResponse(reloadOwner(albumId), true);
    }

    @Override
    public AlbumResponse getMyAlbumDetail(UUID albumId) {
        Album album = albumRepository
                .findByIdAndOwnerUserId(albumId, currentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_UNAUTHORIZED));
        return toDetailResponse(album, true);
    }

    @Override
    public Page<AlbumResponse> getMyAlbums(Pageable pageable) {
        return albumRepository
                .findByOwnerUserId(currentUserId(), pageable)
                .map(this::toSummaryResponse);
    }

    @Override
    public AlbumResponse getPublicAlbum(UUID albumId) {
        Album album = albumRepository.findPublicById(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        return toDetailResponse(album, false);
    }

    @Override
    public Page<AlbumResponse> getPublicAlbumsByArtist(UUID artistId, Pageable pageable) {
        artistRepository.findById(artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return albumRepository
                .findPublicByArtistId(artistId, pageable)
                .map(this::toSummaryResponse);
    }

    @Override
    public Page<AlbumResponse> getAdminQueue(
            AlbumApprovalStatus status, String keyword, Pageable pageable) {
        return albumRepository
                .findForAdminQueue(status, keyword, pageable)
                .map(this::toSummaryResponse);
    }

    @Override
    public AlbumResponse getAdminAlbumDetail(UUID albumId) {
        Album album = albumRepository.findByIdForAdmin(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        return toDetailResponse(album, true);
    }

    @Override @Transactional
    public AlbumResponse approveAlbum(UUID albumId, UUID adminId) {
        Album album = albumRepository.findByIdForAdmin(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));

        if (album.getApprovalStatus() != AlbumApprovalStatus.PENDING)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);
        boolean hasRejected = album.getAlbumSongs().stream()
                .anyMatch(a -> a.getSong().getApprovalStatus() == ApprovalStatus.REJECTED);
        if (hasRejected)
            throw new AppException(ErrorCode.ALBUM_HAS_REJECTED_SONG);

        // Bulk approve bài PENDING (bài APPROVED từ trước → giữ nguyên)
        album.getAlbumSongs().stream()
                .map(AlbumSong::getSong)
                .filter(s -> s.getApprovalStatus() == ApprovalStatus.PENDING
                        && s.getTranscodeStatus() == TranscodeStatus.COMPLETED)
                .forEach(s -> {
                    s.setApprovalStatus(ApprovalStatus.APPROVED);
                    s.setReviewedAt(LocalDateTime.now());
                    s.setReviewedBy(adminId);
                    songRepository.save(s);
                });

        album.setApprovalStatus(AlbumApprovalStatus.APPROVED);
        album.setRejectionReason(null);
        album.setReviewedAt(LocalDateTime.now());
        album.setReviewedBy(adminId);
        albumRepository.save(album);

        log.info("Admin {} approved album {} + bulk-approved pending tracks",
                adminId, albumId);
        return toSummaryResponse(album);
    }

    @Override
    @Transactional
    public AlbumResponse rejectAlbum(
            UUID albumId, UUID adminId, AlbumApprovalRequest request) {
        Album album = albumRepository.findByIdForAdmin(albumId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));

        if (album.getApprovalStatus() != AlbumApprovalStatus.PENDING)
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS_TRANSITION);

        album.setApprovalStatus(AlbumApprovalStatus.REJECTED);
        album.setRejectionReason(request.getRejectionReason());
        album.setReviewedAt(LocalDateTime.now());
        album.setReviewedBy(adminId);
        albumRepository.save(album);

        log.info("Admin {} rejected album {}: {}", adminId, albumId,
                request.getRejectionReason());
        return toSummaryResponse(album);
    }
}