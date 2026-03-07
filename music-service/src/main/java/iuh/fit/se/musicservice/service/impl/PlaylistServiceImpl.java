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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlaylistServiceImpl implements PlaylistService {

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
        if (userId == null) return 3;

        // 1. Đọc Redis
        try {
            String json = stringRedisTemplate.opsForValue()
                    .get("user:subscription:" + userId);
            if (json != null && !json.isBlank()) {
                Map<String, Object> features = objectMapper.readValue(
                        json, new TypeReference<>() {});
                Object limitObj = features.get("playlist_limit");
                if (limitObj instanceof Number n) return n.intValue();
                if (limitObj instanceof String s) return Integer.parseInt(s);
            }
        } catch (Exception e) {
            log.warn("[Playlist] Redis read failed for userId={}: {}", userId, e.getMessage());
        }

        // 2. Fallback: Feign → payment-service
        try {
            var status = paymentInternalClient.getSubscriptionStatus(userId);
            if (status != null && status.isActive() && status.getFeatures() != null) {
                Object limitObj = status.getFeatures().get("playlist_limit");
                if (limitObj instanceof Number n) return n.intValue();
                if (limitObj instanceof String s) return Integer.parseInt(s);
            }
        } catch (Exception e) {
            log.warn("[Playlist] Feign fallback failed for userId={}: {}", userId, e.getMessage());
        }

        return 3; // FREE plan default
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SLUG HELPER
    // ─────────────────────────────────────────────────────────────────────────

    private String generateSlug(String name, UUID id) {
        try {
            String temp = Normalizer.normalize(name, Normalizer.Form.NFD);
            String slug = Pattern.compile("\\p{InCombiningDiacriticalMarks}+")
                    .matcher(temp).replaceAll("")
                    .toLowerCase()
                    .replaceAll("[^a-z0-9\\s-]", "")
                    .replaceAll("[\\s-]+", "-")
                    .replaceAll("^-|-$", "");
            if (slug.length() > 80) slug = slug.substring(0, 80);
            return slug + "-" + id.toString().substring(0, 8);
        } catch (Exception e) {
            return "playlist-" + id.toString().substring(0, 8);
        }
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

    /**
     * Build PlaylistSongResponse từ một linked-list node.
     *
     * Song.java thực tế:
     *   - KHÔNG có @ManyToOne Artist — artist info denormalized thẳng:
     *       song.getPrimaryArtistId()
     *       song.getPrimaryArtistStageName()
     *       song.getPrimaryArtistAvatarUrl()
     *   - KHÔNG có ApprovalStatus
     *   - isPubliclyAvailable() = status==PUBLIC && transcodeStatus==COMPLETED && deletedAt==null
     *   - isDeleted()           = deletedAt != null
     */
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
                .slug(generateSlug(request.getName(), playlistId))
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
                .playlist(playlist)
                .song(song)
                .addedAt(LocalDateTime.now())
                .build();

        newNode = playlistSongRepository.save(newNode);
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
