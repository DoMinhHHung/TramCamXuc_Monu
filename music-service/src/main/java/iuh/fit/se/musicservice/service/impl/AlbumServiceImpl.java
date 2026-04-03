package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.message.FeedContentEvent;
import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumReorderRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.dto.response.AlbumSongResponse;
import iuh.fit.se.musicservice.entity.Album;
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
import iuh.fit.se.musicservice.repository.AlbumRepository;
import iuh.fit.se.musicservice.repository.AlbumSongRepository;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.AlbumService;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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
    private final StringRedisTemplate stringRedisTemplate;
    private final RabbitTemplate rabbitTemplate;

    private static final String LOCK_AUTO_PUBLISH = "lock:album:auto-publish";

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
     */
    private AlbumSongResponse buildSongResponse(AlbumSong node, Song song) {
        boolean available = song.getStatus() == SongStatus.PUBLIC
                && song.getTranscodeStatus() == TranscodeStatus.COMPLETED;
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
                .unavailableReason(available ? null : "Song is not yet available")
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
                    return song != null ? buildSongResponse(node, song) : null;
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

        return albumMapper.toResponse(albumRepository.save(album));
    }

    @Override
    @Transactional
    public void deleteAlbum(UUID albumId) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

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
    @Cacheable(value = "albumDetail", key = "#albumId")
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

        Song song = songRepository.findByIdAndOwnerUserId(songId, currentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (albumSongRepository.existsByAlbumIdAndSongId(albumId, songId)) {
            throw new AppException(ErrorCode.ALBUM_SONG_ALREADY_EXISTS);
        }

        Optional<AlbumSong> tailOpt = albumSongRepository.findByAlbumIdAndNextIdIsNull(albumId);

        AlbumSong newNode = AlbumSong.builder()
                .albumId(albumId)
                .songId(songId)
                .prevId(tailOpt.map(AlbumSong::getId).orElse(null))
                .nextId(null)
                .addedAt(LocalDateTime.now())
                .build();
        newNode = albumSongRepository.save(newNode);

        if (tailOpt.isPresent()) {
            albumSongRepository.updateNextId(tailOpt.get().getId(), newNode.getId());
        } else {
            albumRepository.updateHead(albumId, newNode.getId());
        }

        // Cập nhật total duration
        if (song.getDurationSeconds() != null) {
            albumRepository.addDuration(albumId, song.getDurationSeconds());
        }

        log.info("Song {} added to album {}", songId, albumId);

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

        if (prevId != null) {
            albumSongRepository.updateNextId(prevId, nextId);
        } else {
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

    @Override
    @Transactional
    @CacheEvict(value = "albumDetail", key = "#albumId")
    public AlbumResponse reorderSong(UUID albumId, AlbumReorderRequest request) {
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

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

        // Tất cả bài phải PUBLIC + COMPLETED
        List<AlbumSong> nodes = albumSongRepository.findAllByAlbumId(albumId);
        Set<UUID> songIds = nodes.stream().map(AlbumSong::getSongId).collect(Collectors.toSet());
        List<Song> songs = songRepository.findAllById(songIds);
        boolean allReady = songs.stream().allMatch(s ->
                s.getStatus() == SongStatus.PUBLIC
                        && s.getTranscodeStatus() == TranscodeStatus.COMPLETED);
        if (!allReady) {
            throw new AppException(ErrorCode.ALBUM_HAS_UNREADY_SONGS);
        }

        album.setStatus(AlbumStatus.PUBLIC);
        album.setScheduledPublishAt(null); // huỷ lịch nếu có
        albumRepository.save(album);
        log.info("Album {} published by artist {}", albumId, artist.getId());

        return withSongs(albumRepository.findById(albumId).orElseThrow());
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
        Artist artist = requireCurrentArtist();
        Album album = requireOwnAlbum(albumId, artist.getId());

        if (scheduledAt.isBefore(ZonedDateTime.now())) {
            throw new AppException(ErrorCode.ALBUM_SCHEDULE_INVALID_TIME);
        }

        album.setScheduledPublishAt(scheduledAt);
        album.setStatus(AlbumStatus.PRIVATE);
        log.info("Album {} scheduled to publish at {} by artist {}", albumId, scheduledAt, artist.getId());

        return albumMapper.toResponse(albumRepository.save(album));
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
        return albumMapper.toResponse(albumRepository.save(album));
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

    // ── Scheduled job ──────────────────────────────────────────────────────────

    @Override
    @Scheduled(fixedDelay = 60_000)
    public void autoPublishScheduledAlbums() {
        Boolean acquired = stringRedisTemplate.opsForValue()
                .setIfAbsent(LOCK_AUTO_PUBLISH, "1", Duration.ofSeconds(65));
        if (!Boolean.TRUE.equals(acquired)) {
            log.debug("autoPublishScheduledAlbums skipped — lock held by another instance");
            return;
        }
        doAutoPublish();
    }

    @Transactional
    public void doAutoPublish() {
        List<Album> readyAlbums = albumRepository.findAlbumsReadyToPublish(ZonedDateTime.now());
        if (readyAlbums.isEmpty()) return;

        log.info("Auto-publishing {} scheduled album(s)", readyAlbums.size());
        for (Album album : readyAlbums) {
            try {
                album.setStatus(AlbumStatus.PUBLIC);
                album.setScheduledPublishAt(null);
                albumRepository.save(album);
                log.info("Album {} auto-published", album.getId());
                publishToFeed(album);
            } catch (Exception e) {
                log.error("Failed to auto-publish album {}: {}", album.getId(), e.getMessage());
            }
        }
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
