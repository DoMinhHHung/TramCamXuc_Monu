package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.message.FeedContentEvent;
import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumReorderRequest;
import iuh.fit.se.musicservice.dto.request.AlbumScheduleCommitRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.dto.response.AlbumSongResponse;
import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.entity.AlbumFavorite;
import iuh.fit.se.musicservice.entity.AlbumSong;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import iuh.fit.se.musicservice.enums.AlbumStatus;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.mapper.AlbumMapper;
import iuh.fit.se.musicservice.repository.AlbumFavoriteRepository;
import iuh.fit.se.musicservice.repository.AlbumRepository;
import iuh.fit.se.musicservice.repository.AlbumSongRepository;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.AlbumScheduledPublishCoordinator;
import iuh.fit.se.musicservice.service.AlbumService;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlbumServiceImpl implements AlbumService {

    private final AlbumRepository    albumRepository;
    private final AlbumSongRepository albumSongRepository;
    private final ArtistRepository   artistRepository;
    private final SongRepository     songRepository;
    private final AlbumMapper        albumMapper;
    private final RabbitTemplate rabbitTemplate;
    private final AlbumScheduledPublishCoordinator albumScheduledPublishCoordinator;
    private final AlbumFavoriteRepository albumFavoriteRepository;

    // ── Helpers ────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private Artist requireCurrentArtist() {
        UUID userId = currentUserId();
        return artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
    }

    private Album requireOwnAlbum(UUID albumId, UUID artistId) {
        return albumRepository.findByIdAndOwnerArtistId(albumId, artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_UNAUTHORIZED));
    }

    /** Album PRIVATE đang chờ phát hành theo lịch — không cho thêm / reorder track */
    private void assertNotPendingScheduledRelease(Album album) {
        if (album.getStatus() == AlbumStatus.PRIVATE && album.getScheduledPublishAt() != null) {
            throw new AppException(ErrorCode.ALBUM_PENDING_PUBLISH_LOCKED);
        }
    }

    private void runAfterCommit(Runnable runnable) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    runnable.run();
                }
            });
        } else {
            runnable.run();
        }
    }

    private List<AlbumSong> traverseLinkedList(UUID headId, Map<UUID, AlbumSong> nodeMap) {
        List<AlbumSong> ordered = new ArrayList<>();
        UUID current = headId;
        int safetyLimit = 500; // phòng circular reference
        while (current != null && safetyLimit-- > 0) {
            AlbumSong node = nodeMap.get(current);
            if (node == null) break;
            ordered.add(node);
            current = node.getNextId();
        }
        return ordered;
    }

    /**
     * Build AlbumSongResponse từ AlbumSong node + Song entity.
     * ALBUM_ONLY + album PUBLIC → available (phát hành rồi, nghe trong album).
     */
    private AlbumSongResponse buildSongResponse(AlbumSong node, Song song, Album album) {
        boolean transcodeOk = song.getTranscodeStatus() == TranscodeStatus.COMPLETED;
        boolean inReleasedAlbum = album != null && album.getStatus() == AlbumStatus.PUBLIC;
        boolean available = transcodeOk && (
                song.getStatus() == SongStatus.PUBLIC
                        || (song.getStatus() == SongStatus.ALBUM_ONLY && inReleasedAlbum));
        String reason = available ? null
                : (!transcodeOk ? "Transcoding not finished"
                : (song.getStatus() == SongStatus.ALBUM_ONLY ? "Album not released yet" : "Song is not yet available"));
        return AlbumSongResponse.builder()
                .albumSongId(node.getId())
                .prevId(node.getPrevId())
                .nextId(node.getNextId())
                .songId(song.getId())
                .title(song.getTitle())
                .slug(song.getSlug())
                .thumbnailUrl(song.getThumbnailUrl())
                .durationSeconds(song.getDurationSeconds())
                .addedAt(node.getAddedAt())
                .available(available)
                .unavailableReason(reason)
                .artistId(song.getPrimaryArtistId())
                .artistStageName(song.getPrimaryArtistStageName())
                .artistAvatarUrl(song.getPrimaryArtistAvatarUrl())
                .build();
    }

    /** Nạp songs theo thứ tự linked list và gán vào response */
    private AlbumResponse withSongs(Album album) {
        AlbumResponse response = albumMapper.toResponse(album);

        List<AlbumSong> nodes = albumSongRepository.findAllByAlbumId(album.getId());
        if (nodes.isEmpty()) {
            response.setSongs(Collections.emptyList());
            response.setTotalSongs(0);
            return response;
        }

        Map<UUID, AlbumSong> nodeMap = nodes.stream()
                .collect(Collectors.toMap(AlbumSong::getId, n -> n));

        List<AlbumSong> ordered = traverseLinkedList(album.getHeadSongId(), nodeMap);

        // Batch load songs
        Set<UUID> songIds = ordered.stream()
                .map(AlbumSong::getSongId)
                .collect(Collectors.toSet());
        Map<UUID, Song> songMap = songRepository.findAllById(songIds).stream()
                .collect(Collectors.toMap(Song::getId, s -> s));

        List<AlbumSongResponse> songResponses = ordered.stream()
                .map(node -> {
                    Song song = songMap.get(node.getSongId());
                    return song != null ? buildSongResponse(node, song, album) : null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        response.setSongs(songResponses);
        response.setTotalSongs(songResponses.size());
        return response;
    }

    // ── Artist: CRUD ───────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AlbumResponse createAlbum(AlbumCreateRequest request) {
        Artist artist = requireCurrentArtist();

        if (artist.getStatus() == ArtistStatus.SUSPENDED) {
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        UUID albumId = UUID.randomUUID();
        Album album = Album.builder()
                .id(albumId)
                .title(request.getTitle())
                .slug(SlugUtils.generate(request.getTitle(), albumId))
                .description(request.getDescription())
                .releaseDate(request.getReleaseDate())
                .ownerArtistId(artist.getId())
                .ownerStageName(artist.getStageName())
                .ownerAvatarUrl(artist.getAvatarUrl())
                .status(AlbumStatus.DRAFT)
                .totalDurationSeconds(0)
                .build();

        albumRepository.save(album);
        log.info("Album created: id={}, artist={}", albumId, artist.getStageName());

        AlbumResponse response = albumMapper.toResponse(album);
        response.setSongs(Collections.emptyList());
        response.setTotalSongs(0);
        return response;
    }

    @Override
    @Transactional
    public AlbumResponse updateAlbum(UUID albumId, AlbumUpdateRequest request) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            album.setTitle(request.getTitle());
            album.setSlug(SlugUtils.generate(request.getTitle(), album.getId()));
        }
        if (request.getDescription() != null) {
            album.setDescription(request.getDescription());
        }
        if (request.getReleaseDate() != null) {
            album.setReleaseDate(request.getReleaseDate());
        }
        if (request.getCredits() != null) {
            album.setCredits(request.getCredits());
        }

        return albumMapper.toResponse(albumRepository.save(album));
    }

    @Override
    @Transactional
    public void deleteAlbum(UUID albumId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        // Xóa tất cả album-song nodes trước
        albumSongRepository.deleteAll(albumSongRepository.findAllByAlbumId(albumId));
        albumRepository.delete(album);
        log.info("Album {} deleted by artist {}", albumId, artist.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> getMyAlbums(Pageable pageable) {
        Artist artist = requireCurrentArtist();
        return albumRepository.findByOwnerArtistId(artist.getId(), pageable)
                .map(albumMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlbumResponse> getMyAlbumsContainingSong(UUID songId) {
        Artist artist = requireCurrentArtist();
        List<AlbumSong> nodes = albumSongRepository.findBySongId(songId);
        if (nodes.isEmpty()) {
            return Collections.emptyList();
        }
        Set<UUID> albumIds = nodes.stream()
                .map(AlbumSong::getAlbumId)
                .collect(Collectors.toSet());
        List<AlbumResponse> out = new ArrayList<>();
        for (UUID aid : albumIds) {
            albumRepository.findByIdAndOwnerArtistId(aid, artist.getId())
                    .ifPresent(a -> out.add(albumMapper.toResponse(a)));
        }
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public AlbumResponse getAlbumDetail(UUID albumId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());
        return withSongs(album);
    }

    // ── Artist: Song management ────────────────────────────────────────────────

    @Override
    @Transactional
    public AlbumResponse addSongToAlbum(UUID albumId, UUID songId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());
        assertNotPendingScheduledRelease(album);


        // Kiểm tra bài hát tồn tại và thuộc về artist này
        Song song = songRepository.findByIdAndOwnerUserId(songId, currentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        // Kiểm tra chưa có trong album này
        if (albumSongRepository.existsByAlbumIdAndSongId(albumId, songId)) {
            throw new AppException(ErrorCode.ALBUM_SONG_ALREADY_EXISTS);
        }

        // Nếu album chưa phát hành (không phải PUBLIC), đổi status bài hát thành ALBUM_ONLY nếu chưa phải ALBUM_ONLY
        if (album.getStatus() != AlbumStatus.PUBLIC && song.getStatus() != SongStatus.ALBUM_ONLY) {
            song.setStatus(SongStatus.ALBUM_ONLY);
            songRepository.save(song);
        }

        // Tìm node cuối để nối vào (append vào cuối linked list)
        Optional<AlbumSong> tailOpt = albumSongRepository.findByAlbumIdAndNextIdIsNull(albumId);

        AlbumSong newNode = AlbumSong.builder()
                .albumId(albumId)
                .songId(songId)
                .prevId(tailOpt.map(AlbumSong::getId).orElse(null))
                .nextId(null)
                .addedAt(LocalDateTime.now())
                .build();
        newNode = albumSongRepository.save(newNode);

        // Cập nhật tail.nextId → newNode
        if (tailOpt.isPresent()) {
            albumSongRepository.updateNextId(tailOpt.get().getId(), newNode.getId());
        } else {
            // Album rỗng → newNode là head
            albumRepository.updateHead(albumId, newNode.getId());
        }

        // Cập nhật total duration
        if (song.getDurationSeconds() != null) {
            albumRepository.addDuration(albumId, song.getDurationSeconds());
        }

        log.info("Song {} added to album {}", songId, albumId);

        // Reload album để lấy trạng thái mới nhất
        Album updated = albumRepository.findById(albumId).orElseThrow();
        return withSongs(updated);
    }

    @Override
    @Transactional
    public AlbumResponse removeSongFromAlbum(UUID albumId, UUID songId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        AlbumSong node = albumSongRepository.findByAlbumIdAndSongId(albumId, songId)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_SONG_NOT_FOUND));

        UUID prevId = node.getPrevId();
        UUID nextId = node.getNextId();

        // Nối lại: prev.next = next, next.prev = prev
        if (prevId != null) {
            albumSongRepository.updateNextId(prevId, nextId);
        } else {
            // node là head → chuyển head sang nextId
            albumRepository.updateHead(albumId, nextId);
        }

        if (nextId != null) {
            albumSongRepository.updatePrevId(nextId, prevId);
        }

        albumSongRepository.delete(node);

        // Cập nhật duration
        Song song = songRepository.findById(songId).orElse(null);
        if (song != null && song.getDurationSeconds() != null) {
            albumRepository.addDuration(albumId, -song.getDurationSeconds());
        }

        log.info("Song {} removed from album {}", songId, albumId);

        Album updated = albumRepository.findById(albumId).orElseThrow();
        return withSongs(updated);
    }

    /**
     * Drag-and-drop reorder — cập nhật O(1) linked list pointers.
     *
     * Payload: { draggedId, prevId (nullable), nextId (nullable) }
     *   prevId = null → kéo lên đầu
     *   nextId = null → kéo xuống cuối
     *
     * Thuật toán:
     *   1. Tách draggedNode ra khỏi vị trí cũ (nối oldPrev ↔ oldNext)
     *   2. Chèn vào vị trí mới (giữa prevId và nextId)
     */
    @Override
    @Transactional
    public AlbumResponse reorderSong(UUID albumId, AlbumReorderRequest request) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());
        assertNotPendingScheduledRelease(album);

        AlbumSong dragged = albumSongRepository.findById(request.getDraggedId())
                .filter(n -> n.getAlbumId().equals(albumId))
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_SONG_NOT_FOUND));

        // Không thay đổi gì nếu kéo về cùng vị trí
        if (Objects.equals(dragged.getPrevId(), request.getPrevId())
                && Objects.equals(dragged.getNextId(), request.getNextId())) {
            return withSongs(album);
        }

        UUID oldPrev = dragged.getPrevId();
        UUID oldNext = dragged.getNextId();

        // Bước 1: Tách dragged ra khỏi vị trí cũ
        if (oldPrev != null) {
            albumSongRepository.updateNextId(oldPrev, oldNext);
        } else {
            // dragged là head cũ → head mới = oldNext
            albumRepository.updateHead(albumId, oldNext);
        }
        if (oldNext != null) {
            albumSongRepository.updatePrevId(oldNext, oldPrev);
        }

        // Bước 2: Chèn vào vị trí mới
        UUID newPrev = request.getPrevId();
        UUID newNext = request.getNextId();

        dragged.setPrevId(newPrev);
        dragged.setNextId(newNext);
        albumSongRepository.save(dragged);

        if (newPrev != null) {
            albumSongRepository.updateNextId(newPrev, dragged.getId());
        } else {
            // dragged là head mới
            albumRepository.updateHead(albumId, dragged.getId());
        }
        if (newNext != null) {
            albumSongRepository.updatePrevId(newNext, dragged.getId());
        }

        log.info("Song reordered in album {}: node {} moved after {}", albumId, dragged.getId(), newPrev);

        Album updated = albumRepository.findById(albumId).orElseThrow();
        return withSongs(updated);
    }

    // ── Artist: Publishing ─────────────────────────────────────────────────────

    @Override
    @Transactional
    public AlbumResponse publishAlbum(UUID albumId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        // Phải có ít nhất 1 bài
        if (albumSongRepository.countByAlbumId(albumId) == 0) {
            throw new AppException(ErrorCode.ALBUM_EMPTY);
        }

        List<AlbumSong> nodes = albumSongRepository.findAllByAlbumId(albumId);
        Set<UUID> songIds = nodes.stream().map(AlbumSong::getSongId).collect(Collectors.toSet());
        List<Song> songs = songRepository.findAllById(songIds);
        boolean allReady = songs.stream().allMatch(s ->
                s.getTranscodeStatus() == TranscodeStatus.COMPLETED
                        && (s.getStatus() == SongStatus.PUBLIC || s.getStatus() == SongStatus.ALBUM_ONLY));
        if (!allReady) {
            throw new AppException(ErrorCode.ALBUM_HAS_UNREADY_SONGS);
        }

        // Khi album phát hành, chuyển các bài hát ALBUM_ONLY trong album thành PUBLIC
        List<AlbumSong> nodesToUpdate = albumSongRepository.findAllByAlbumId(albumId);
        Set<UUID> songIdsToUpdate = nodesToUpdate.stream().map(AlbumSong::getSongId).collect(Collectors.toSet());
        List<Song> songsToUpdate = songRepository.findAllById(songIdsToUpdate);
        for (Song s : songsToUpdate) {
            if (s.getStatus() == SongStatus.ALBUM_ONLY) {
                s.setStatus(SongStatus.PUBLIC);
                songRepository.save(s);
            }
        }

        album.setStatus(AlbumStatus.PUBLIC);
        album.setScheduledPublishAt(null);
        album.setScheduleCommittedAt(null);
        if (album.getPublishedAt() == null) {
            album.setPublishedAt(ZonedDateTime.now());
        }
        albumRepository.save(album);
        UUID aid = album.getId();
        runAfterCommit(() -> albumScheduledPublishCoordinator.cancelPublishTask(aid));
        log.info("Album {} published by artist {}", albumId, artist.getId());

        Album saved = albumRepository.findById(albumId).orElseThrow();
        publishToFeed(saved);
        return withSongs(saved);
    }

    @Override
    @Transactional
    public AlbumResponse unpublishAlbum(UUID albumId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        if (album.getStatus() != AlbumStatus.PUBLIC) {
            throw new AppException(ErrorCode.ALBUM_INVALID_STATUS);
        }

        album.setStatus(AlbumStatus.PRIVATE);
        albumRepository.save(album);
        log.info("Album {} unpublished by artist {}", albumId, artist.getId());

        return albumMapper.toResponse(albumRepository.save(album));
    }

    @Override
    @Transactional
    public AlbumResponse schedulePublish(UUID albumId, ZonedDateTime scheduledAt) {
        return commitSchedule(albumId, AlbumScheduleCommitRequest.builder().publishAt(scheduledAt).build());
    }

    @Override
    @Transactional
    public AlbumResponse commitSchedule(UUID albumId, AlbumScheduleCommitRequest request) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        ZonedDateTime newAt = request.getPublishAt();
        if (!newAt.isAfter(ZonedDateTime.now())) {
            throw new AppException(ErrorCode.ALBUM_SCHEDULE_INVALID_TIME);
        }

        ZonedDateTime oldAt = album.getScheduledPublishAt();
        boolean timeChanged = oldAt == null || !oldAt.isEqual(newAt);
        if (timeChanged
                && album.getScheduleCommittedAt() != null
                && ZonedDateTime.now().isBefore(album.getScheduleCommittedAt().plusHours(6))) {
            throw new AppException(ErrorCode.ALBUM_SCHEDULE_EDIT_COOLDOWN);
        }

        album.setScheduledPublishAt(newAt);
        album.setScheduleCommittedAt(ZonedDateTime.now());
        if (request.getCredits() != null) {
            album.setCredits(request.getCredits());
        }
        album.setStatus(AlbumStatus.PRIVATE);

        albumRepository.save(album);
        final UUID aid = album.getId();
        final Instant publishInstant = newAt.toInstant();
        runAfterCommit(() -> albumScheduledPublishCoordinator.registerPublishTask(aid, publishInstant));

        log.info("Album {} scheduled to publish at {} by artist {}", albumId, newAt, artist.getId());
        return albumMapper.toResponse(albumRepository.findById(albumId).orElseThrow());
    }

    @Override
    @Transactional
    public AlbumResponse cancelScheduledPublish(UUID albumId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        if (album.getScheduledPublishAt() == null) {
            throw new AppException(ErrorCode.ALBUM_SCHEDULE_NOT_FOUND);
        }

        album.setScheduledPublishAt(null);
        album.setScheduleCommittedAt(null);
        albumRepository.save(album);
        final UUID aid = albumId;
        runAfterCommit(() -> albumScheduledPublishCoordinator.cancelPublishTask(aid));
        return albumMapper.toResponse(albumRepository.findById(albumId).orElseThrow());
    }

    // ── Public ─────────────────────────────────────────────────────────────────

//    @Override
//    public Page<AlbumResponse> getPublicAlbums(String artistIdStr, Pageable pageable) {
//        if (artistIdStr != null) {
//            UUID artistId = UUID.fromString(artistIdStr);
//            return albumRepository.findByOwnerArtistIdAndStatus(artistId, AlbumStatus.PUBLIC, pageable)
//                    .map(albumMapper::toResponse);
//        }
//        return albumRepository.findAll(pageable)
//                .map(a -> {
//                    if (a.getStatus() == AlbumStatus.PUBLIC) return albumMapper.toResponse(a);
//                    return null;
//                })
//                .filter(Objects::nonNull);
//    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> getPublicAlbums(String artistIdStr, Pageable pageable) {
        if (artistIdStr != null) {
            UUID artistId = UUID.fromString(artistIdStr);
            return albumRepository
                    .findByOwnerArtistIdAndStatus(artistId, AlbumStatus.PUBLIC, pageable)
                    .map(albumMapper::toResponse);
        }

        return albumRepository
                .findByStatus(AlbumStatus.PUBLIC, pageable)
                .map(albumMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AlbumResponse getPublicAlbumDetail(UUID albumId) {
        Album album = albumRepository.findByIdAndStatus(albumId, AlbumStatus.PUBLIC)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        return withSongs(album);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> getRecentlyPublishedAlbums(Pageable pageable, int withinDays) {
        int days = Math.min(Math.max(withinDays, 1), 30);
        ZonedDateTime since = ZonedDateTime.now().minusDays(days);
        return albumRepository
                .findPublicPublishedSince(since, AlbumStatus.PUBLIC, pageable)
                .map(albumMapper::toResponse);
    }

    @Override
    @Transactional
    public void favoriteAlbum(UUID albumId) {
        albumRepository.findByIdAndStatus(albumId, AlbumStatus.PUBLIC)
                .orElseThrow(() -> new AppException(ErrorCode.ALBUM_NOT_FOUND));
        UUID userId = currentUserId();
        if (albumFavoriteRepository.existsByUserIdAndAlbumId(userId, albumId)) {
            return;
        }
        albumFavoriteRepository.save(AlbumFavorite.builder()
                .userId(userId)
                .albumId(albumId)
                .build());
    }

    @Override
    @Transactional
    public void unfavoriteAlbum(UUID albumId) {
        UUID userId = currentUserId();
        albumFavoriteRepository.deleteByUserIdAndAlbumId(userId, albumId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAlbumFavoritedByMe(UUID albumId) {
        UUID userId = currentUserId();
        return albumFavoriteRepository.existsByUserIdAndAlbumId(userId, albumId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> adminRecentlyPublishedAlbums(Pageable pageable, int withinDays) {
        return getRecentlyPublishedAlbums(pageable, withinDays);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlbumResponse> adminTopFavoritedAlbumsThisWeek(int limit) {
        return adminTopFavoritedAlbumsSince(limit, LocalDateTime.now().minusDays(7));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlbumResponse> adminTopFavoritedAlbumsThisMonth(int limit) {
        return adminTopFavoritedAlbumsSince(limit, LocalDateTime.now().minusDays(30));
    }

    private List<AlbumResponse> adminTopFavoritedAlbumsSince(int limit, LocalDateTime since) {
        int cap = Math.min(Math.max(limit, 1), 100);
        List<Object[]> rows = albumFavoriteRepository.topAlbumIdsByFavoriteSinceRaw(since, PageRequest.of(0, cap));
        List<AlbumResponse> out = new ArrayList<>();
        for (Object[] row : rows) {
            if (row == null || row.length == 0 || row[0] == null) {
                continue;
            }
            Object rawId = row[0];
            UUID aid = rawId instanceof UUID u ? u : UUID.fromString(rawId.toString());
            albumRepository.findById(aid).ifPresent(a -> out.add(albumMapper.toResponse(a)));
        }
        return out;
    }

    private void publishToFeed(Album album) {
        try {
            FeedContentEvent event = FeedContentEvent.builder()
                    .contentId(album.getId())
                    .contentType(FeedContentEvent.ContentType.ALBUM)
                    .artistId(album.getOwnerArtistId())
                    .title(album.getTitle())
                    .coverImageUrl(album.getCoverUrl())
                    .visibility(FeedContentEvent.Visibility.PUBLIC)
                    .publishedAt(Instant.now())
                    .build();
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.FEED_FANOUT_EXCHANGE, "", event);
            log.info("Feed event published for albumId={}", album.getId());
        } catch (Exception e) {
            log.warn("Failed to publish feed event for albumId={}: {}",
                    album.getId(), e.getMessage());
        }
    }
}
