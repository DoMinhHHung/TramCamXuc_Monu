// ...existing code...
package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.client.PaymentInternalClient;
import iuh.fit.se.musicservice.dto.request.PlaylistCreateRequest;
import iuh.fit.se.musicservice.dto.request.PlaylistUpdateRequest;
import iuh.fit.se.musicservice.dto.request.ReorderRequest;
import iuh.fit.se.musicservice.dto.response.PlaylistResponse;
import iuh.fit.se.musicservice.dto.response.PlaylistSongResponse;
import iuh.fit.se.musicservice.entity.Playlist;
import iuh.fit.se.musicservice.entity.PlaylistSong;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.PlaylistVisibility;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.PlaylistRepository;
import iuh.fit.se.musicservice.repository.PlaylistSongRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.PlaylistService;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlaylistServiceImpl implements PlaylistService {
        /**
         * Lưu playlist từ Discovery: tạo bản copy, gắn description đặc biệt, đánh dấu discovery, tăng share count.
         */
        @Override
        @Transactional
        public PlaylistResponse saveFromDiscovery(UUID sourcePlaylistId, String sourceAuthorName) {
            UUID userId = currentUserId();
            // 1. Tìm playlist gốc (chỉ cho phép copy playlist PUBLIC)
            Playlist source = playlistRepository.findById(sourcePlaylistId)
                    .filter(p -> p.getVisibility() == PlaylistVisibility.PUBLIC)
                    .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND));

            // 2. Không cho phép copy lại discovery copy
            if (source.isDiscoveryCopy()) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            // 3. Tạo bản copy với các trường đặc biệt
            UUID newId = UUID.randomUUID();
            String specialDesc = "[BẢN SAO DISCOVERY] Được lưu từ playlist của " + sourceAuthorName + ". Bạn không thể chỉnh sửa hay chia sẻ lại.";

            Playlist copy = Playlist.builder()
                    .id(newId)
                    .name(source.getName())
                    .slug(SlugUtils.generate(source.getName(), newId))
                    .description(specialDesc)
                    .coverUrl(source.getCoverUrl())
                    .ownerId(userId)
                    .visibility(PlaylistVisibility.PRIVATE) // Bản copy luôn là PRIVATE
                    .headSongId(null) // Sẽ set lại bên dưới
                    .isDiscoveryCopy(true)
                    .discoverySourceId(source.getId())
                    .discoverySourceType("PLAYLIST")
                    .discoverySourceName(source.getName())
                    .build();

            // 4. Copy các bài hát (giữ nguyên thứ tự)
            List<PlaylistSong> sourceSongs = playlistSongRepository.findAllByPlaylistId(source.getId());
            Map<UUID, PlaylistSong> nodeMap = sourceSongs.stream().collect(Collectors.toMap(PlaylistSong::getId, Function.identity()));
            List<PlaylistSong> ordered = linkedListService.toOrderedList(source.getHeadSongId(), nodeMap);

            UUID prevId = null;
            UUID firstId = null;
            for (PlaylistSong srcNode : ordered) {
                UUID nodeId = UUID.randomUUID();
                PlaylistSong newNode = PlaylistSong.builder()
                        .id(nodeId)
                        .playlist(copy)
                        .song(srcNode.getSong())
                        .addedAt(LocalDateTime.now())
                        .prevId(prevId)
                        .nextId(null)
                        .build();
                if (prevId != null) {
                    // Update previous node's nextId
                    copy.getSongs().get(copy.getSongs().size() - 1).setNextId(nodeId);
                } else {
                    firstId = nodeId;
                }
                copy.getSongs().add(newNode);
                prevId = nodeId;
            }
            copy.setHeadSongId(firstId);

            // 5. Lưu bản copy
            playlistRepository.save(copy);

            // 6. Tăng share count cho playlist gốc (nếu có trường này, nếu không thì bỏ qua)
            // TODO: Nếu có trường shareCount trong Playlist, tăng lên. Nếu chưa có, bỏ qua bước này.

            // 7. Trả về response
            return toDetailResponse(copy);
        }
    private static final int DEFAULT_PLAYLIST_LIMIT = 5;

    private final PlaylistRepository     playlistRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final SongRepository         songRepository;
    private final LinkedListService      linkedListService;
    private final MinioStorageService    storageService;
    private final ObjectMapper           objectMapper;
    private final StringRedisTemplate    stringRedisTemplate;
    private final PaymentInternalClient  paymentInternalClient;

    // ─────────────────────────────────────────────────────────────────────────
    // SECURITY HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private UUID currentUserIdOrNull() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()
                    || "anonymousUser".equals(auth.getPrincipal())) return null;
            return UUID.fromString(auth.getName());
        } catch (Exception e) {
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIPTION HELPERS
    // ─────────────────────────────────────────────────────────────────────────



    private int resolvePlaylistLimit() {
        UUID userId = currentUserIdOrNull();
        if (userId == null) return DEFAULT_PLAYLIST_LIMIT;

        try {
            String json = stringRedisTemplate.opsForValue()
                    .get("user:subscription:" + userId);
            if (json != null && !json.isBlank()) {
                Map<String, Object> features = objectMapper.readValue(
                        json, new TypeReference<>() {});
                Object limitObj = features.get("playlist_limit");
                if (limitObj instanceof Number n) {
                    int parsed = n.intValue();
                    if (parsed > 0) return parsed;
                }
                if (limitObj instanceof String s) {
                    int parsed = Integer.parseInt(s);
                    if (parsed > 0) return parsed;
                }
            }
        } catch (Exception e) {
            log.warn("[Playlist] Redis read failed for userId={}: {}", userId, e.getMessage());
        }

        try {
            var status = paymentInternalClient.getSubscriptionStatus(userId);
            if (status != null && status.isActive() && status.getFeatures() != null) {
                Object limitObj = status.getFeatures().get("playlist_limit");
                if (limitObj instanceof Number n) {
                    int parsed = n.intValue();
                    if (parsed > 0) return parsed;
                }
                if (limitObj instanceof String s) {
                    int parsed = Integer.parseInt(s);
                    if (parsed > 0) return parsed;
                }
            }
        } catch (Exception e) {
            log.warn("[Playlist] Feign fallback failed for userId={}: {}", userId, e.getMessage());
        }

        return DEFAULT_PLAYLIST_LIMIT; // FREE plan default
    }


    // ─────────────────────────────────────────────────────────────────────────
    // RESPONSE BUILDERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Summary — không load songs (dùng cho list view, tránh N+1) */
    private PlaylistResponse toSummaryResponse(Playlist playlist) {
        long total = playlistSongRepository.countByPlaylistId(playlist.getId());
        return PlaylistResponse.builder()
                .id(playlist.getId())
                .name(playlist.getName())
                .slug(playlist.getSlug())
                .description(playlist.getDescription())
                .coverUrl(playlist.getCoverUrl())
                .ownerId(playlist.getOwnerId())
                .visibility(playlist.getVisibility())
                .totalSongs((int) total)
                .createdAt(playlist.getCreatedAt())
                .updatedAt(playlist.getUpdatedAt())
                .songs(null)
                .build();
    }

    /** Detail — walk linked list và build ordered song list */
    private PlaylistResponse toDetailResponse(Playlist playlist) {
        List<PlaylistSong> allNodes = playlistSongRepository
                .findAllByPlaylistId(playlist.getId());

        Map<UUID, PlaylistSong> nodeMap = allNodes.stream()
                .collect(Collectors.toMap(PlaylistSong::getId, Function.identity()));

        List<PlaylistSong> ordered = linkedListService
                .toOrderedList(playlist.getHeadSongId(), nodeMap);

        List<PlaylistSongResponse> songResponses = ordered.stream()
                .map(this::toSongResponse)
                .toList();

        return PlaylistResponse.builder()
                .id(playlist.getId())
                .name(playlist.getName())
                .slug(playlist.getSlug())
                .description(playlist.getDescription())
                .coverUrl(playlist.getCoverUrl())
                .ownerId(playlist.getOwnerId())
                .visibility(playlist.getVisibility())
                .totalSongs(ordered.size())
                .createdAt(playlist.getCreatedAt())
                .updatedAt(playlist.getUpdatedAt())
                .songs(songResponses)
                .build();
    }

    private PlaylistSongResponse toSongResponse(PlaylistSong ps) {
        Song song = ps.getSong();

        boolean isDeleted   = song.isDeleted();
        boolean isAvailable = song.isPubliclyAvailable();

        String unavailableReason = null;
        if (isDeleted) {
            unavailableReason = "Bài hát không tồn tại do nghệ sĩ đã xóa";
        } else if (!isAvailable) {
            unavailableReason = "Bài hát hiện không khả dụng";
        }

        return PlaylistSongResponse.builder()
                .playlistSongId(ps.getId())
                .prevId(ps.getPrevId())
                .nextId(ps.getNextId())
                .addedAt(ps.getAddedAt())
                // Song info — ẩn hết nếu đã bị xóa
                .songId(song.getId())
                .title(isDeleted ? "Bài hát không xác định" : song.getTitle())
                .slug(isDeleted ? null : song.getSlug())
                .thumbnailUrl(isDeleted ? null : song.getThumbnailUrl())
                .durationSeconds(isDeleted ? null : song.getDurationSeconds())
                .playCount(isDeleted ? null : song.getPlayCount())
                .available(isAvailable)
                .unavailableReason(unavailableReason)
                // Artist info — denormalized trực tiếp từ Song (không có @ManyToOne)
                .artistId(isDeleted ? null : song.getPrimaryArtistId())
                .artistStageName(isDeleted ? null : song.getPrimaryArtistStageName())
                .artistAvatarUrl(isDeleted ? null : song.getPrimaryArtistAvatarUrl())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GUARD HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Playlist requireOwner(UUID playlistId, UUID userId) {
        return playlistRepository.findByIdAndOwnerId(playlistId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_UNAUTHORIZED));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PlaylistResponse createPlaylist(PlaylistCreateRequest request) {
        UUID userId = currentUserId();

        int  limit   = resolvePlaylistLimit();
        long current = playlistRepository.countByOwnerId(userId);
        if (current >= limit) {
            throw new AppException(ErrorCode.PLAYLIST_LIMIT_EXCEEDED);
        }

        UUID playlistId = UUID.randomUUID();
        Playlist playlist = Playlist.builder()
                .id(playlistId)
                .name(request.getName())
                .slug(SlugUtils.generate(request.getName(), playlistId))
                .description(request.getDescription())
                .ownerId(userId)
                .visibility(request.getVisibility() != null
                        ? request.getVisibility()
                        : PlaylistVisibility.PUBLIC)
                .headSongId(null)
                .build();

        return toSummaryResponse(playlistRepository.save(playlist));
    }

    @Override
    @Transactional
    public PlaylistResponse updatePlaylist(UUID playlistId, PlaylistUpdateRequest request) {
        Playlist playlist = requireOwner(playlistId, currentUserId());

        if (request.getName() != null && !request.getName().isBlank())
            playlist.setName(request.getName());
        if (request.getDescription() != null)
            playlist.setDescription(request.getDescription());
        if (request.getVisibility() != null)
            playlist.setVisibility(request.getVisibility());

        return toSummaryResponse(playlistRepository.save(playlist));
    }

    @Override
    @Transactional
    public void deletePlaylist(UUID playlistId) {
        Playlist playlist = requireOwner(playlistId, currentUserId());
        playlistRepository.delete(playlist);
        log.info("Playlist {} deleted by owner {}", playlistId, playlist.getOwnerId());
    }

    @Override
    @Transactional
    public PlaylistResponse uploadCover(UUID playlistId, MultipartFile file) {
        Playlist playlist = requireOwner(playlistId, currentUserId());
        String key = "playlist-covers/" + playlistId + "/" + file.getOriginalFilename();
        String url = storageService.uploadPublicFile(key, file);
        playlist.setCoverUrl(url);
        return toSummaryResponse(playlistRepository.save(playlist));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIEW
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PlaylistResponse getById(UUID playlistId) {
        UUID userId = currentUserIdOrNull();

        Playlist playlist = userId != null
                ? playlistRepository.findByIdForUser(playlistId, userId)
                        .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND))
                : playlistRepository.findPublicById(playlistId)
                        .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND));

        return toDetailResponse(playlist);
    }

    @Override
    public PlaylistResponse getBySlug(String slug) {
        UUID userId = currentUserIdOrNull();

        Playlist playlist = userId != null
                ? playlistRepository.findBySlugForUser(slug, userId)
                        .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND))
                : playlistRepository.findPublicBySlug(slug)
                        .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND));

        return toDetailResponse(playlist);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PlaylistResponse> getMyPlaylists(Pageable pageable) {
        return playlistRepository
                .findByOwnerId(currentUserId(), pageable)
                .map(this::toSummaryResponse);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SONGS
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PlaylistResponse addSong(UUID playlistId, UUID songId) {
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);

        // Chỉ bài isPubliclyAvailable() = PUBLIC + COMPLETED + chưa xóa
        Song song = songRepository.findById(songId)
                .filter(Song::isPubliclyAvailable)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_AVAILABLE_FOR_PLAYLIST));

        if (playlistSongRepository.existsByPlaylistIdAndSongId(playlistId, songId)) {
            throw new AppException(ErrorCode.PLAYLIST_SONG_ALREADY_EXISTS);
        }

        PlaylistSong newNode = PlaylistSong.builder()
                .id(UUID.randomUUID())
                .playlist(playlist)
                .song(song)
                .addedAt(LocalDateTime.now())
                .build();

        linkedListService.append(playlistId, newNode);

        log.info("Song {} added to playlist {} by user {}", songId, playlistId, userId);

        playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND));
        return toDetailResponse(playlist);
    }

    @Override
    @Transactional
    public void removeSong(UUID playlistId, UUID songId) {
        UUID userId = currentUserId();
        requireOwner(playlistId, userId);

        PlaylistSong node = playlistSongRepository
                .findByPlaylistIdAndSongId(playlistId, songId)
                .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_SONG_NOT_FOUND));

        linkedListService.unlink(playlistId, node);
        playlistSongRepository.delete(node);

        log.info("Song {} removed from playlist {} by user {}", songId, playlistId, userId);
    }

    @Override
    @Transactional
    public PlaylistResponse reorder(UUID playlistId, ReorderRequest request) {
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);

        PlaylistSong target = playlistSongRepository
                .findById(request.getDraggedId())
                .filter(ps -> ps.getPlaylist().getId().equals(playlistId))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        linkedListService.move(playlistId, target, request.getPrevId(), request.getNextId());

        playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new AppException(ErrorCode.PLAYLIST_NOT_FOUND));
        return toDetailResponse(playlist);
    }
}
