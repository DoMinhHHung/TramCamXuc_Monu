package iuh.fit.se.music.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.exception.*;
import iuh.fit.se.core.service.StorageService;
import iuh.fit.se.music.dto.request.PlaylistCreateRequest;
import iuh.fit.se.music.dto.request.PlaylistUpdateRequest;
import iuh.fit.se.music.dto.request.ReorderRequest;
import iuh.fit.se.music.dto.response.PlaylistResponse;
import iuh.fit.se.music.dto.response.PlaylistSongResponse;
import iuh.fit.se.music.entity.Playlist;
import iuh.fit.se.music.entity.PlaylistSong;
import iuh.fit.se.music.entity.Song;
import iuh.fit.se.music.enums.ApprovalStatus;
import iuh.fit.se.music.enums.PlaylistVisibility;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.enums.TranscodeStatus;
import iuh.fit.se.music.repository.*;
import iuh.fit.se.music.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
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

    private final PlaylistRepository playlistRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final SongRepository songRepository;
    private final LinkedListService linkedListService;
    private final StorageService storageService;

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );
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

    /**
     * Sinh slug từ tên playlist + 8 ký tự UUID để tránh trùng.
     * "Nhạc Chill Buổi Tối" + id → "nhac-chill-buoi-toi-a1b2c3d4"
     */
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

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private Playlist requireOwner(UUID playlistId, UUID userId) {
        return playlistRepository.findByIdAndOwnerId(playlistId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
    }

    private int resolvePlaylistLimit() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null) return 3;

            String featuresJson = null;
            Object creds = auth.getCredentials();
            if (creds instanceof Claims claims) {
                featuresJson = claims.get("features", String.class);
            } else if (creds instanceof Map<?, ?> map) {
                Object raw = map.get("features");
                if (raw != null) featuresJson = raw.toString();
            }

            if (featuresJson == null) return 3;

            Map<String, Object> features = new ObjectMapper()
                    .readValue(featuresJson, new TypeReference<>() {});

            Object limitObj = features.get(SubscriptionConstants.FEATURE_PLAYLIST_LIMIT);
            if (limitObj instanceof Integer i) return i;
            if (limitObj instanceof Number n) return n.intValue();
        } catch (Exception e) {
            log.warn("Could not resolve playlist limit, defaulting to 3");
        }
        return 3;
    }

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

    /** Response có danh sách bài theo đúng thứ tự linked list (dùng khi xem chi tiết) */
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

        boolean isDeleted     = song.getStatus() == SongStatus.DELETED;
        boolean isUnavailable = isDeleted
                || song.getApprovalStatus() != ApprovalStatus.APPROVED
                || song.getStatus() == SongStatus.PRIVATE
                || song.getTranscodeStatus() != TranscodeStatus.COMPLETED;

        String unavailableReason = null;
        if (isDeleted) {
            unavailableReason = "Bài hát không tồn tại do nghệ sĩ đã xóa";
        } else if (isUnavailable) {
            unavailableReason = "Bài hát hiện không khả dụng";
        }

        return PlaylistSongResponse.builder()
                .playlistSongId(ps.getId())
                .prevId(ps.getPrevId())
                .nextId(ps.getNextId())
                .addedAt(ps.getAddedAt())
                .songId(song.getId())
                .title(isDeleted ? "Bài hát không xác định" : song.getTitle())
                .slug(isDeleted ? null : song.getSlug())
                .thumbnailUrl(isDeleted ? null : song.getThumbnailUrl())
                .durationSeconds(isDeleted ? null : song.getDurationSeconds())
                .playCount(isDeleted ? null : song.getPlayCount())
                .available(!isUnavailable)
                .unavailableReason(unavailableReason)
                .artistId(isDeleted ? null : song.getPrimaryArtist().getId())
                .artistStageName(isDeleted ? null : song.getPrimaryArtist().getStageName())
                .artistAvatarUrl(isDeleted ? null : song.getPrimaryArtist().getAvatarUrl())
                .build();
    }


    @Override
    @Transactional
    public PlaylistResponse createPlaylist(PlaylistCreateRequest request) {
        UUID userId = currentUserId();

        int limit = resolvePlaylistLimit();
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
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);

        if (hasText(request.getName()))        playlist.setName(request.getName());
        if (request.getDescription() != null)  playlist.setDescription(request.getDescription());
        if (request.getVisibility() != null)   playlist.setVisibility(request.getVisibility());

        return toSummaryResponse(playlistRepository.save(playlist));
    }

    @Override
    @Transactional
    public void deletePlaylist(UUID playlistId) {
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);
        playlistRepository.delete(playlist);
    }

    @Override
    @Transactional
    public PlaylistResponse uploadCover(UUID playlistId, MultipartFile file) {
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);

        String key = "playlist-covers/" + playlistId + "/" + file.getOriginalFilename();
        String url = storageService.uploadPublicFile(key, file);
        playlist.setCoverUrl(url);

        return toSummaryResponse(playlistRepository.save(playlist));
    }

    @Override
    public PlaylistResponse getBySlug(String slug) {
        UUID userId = currentUserIdOrNull();

        Playlist playlist;
        if (userId != null) {
            playlist = playlistRepository.findBySlugForUser(slug, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
        } else {
            playlist = playlistRepository.findPublicBySlug(slug)
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
        }

        return toDetailResponse(playlist);
    }

    @Override
    public Page<PlaylistResponse> getMyPlaylists(Pageable pageable) {
        UUID userId = currentUserId();
        return playlistRepository.findByOwnerId(userId, pageable)
                .map(this::toSummaryResponse);
    }

    @Override
    public PlaylistResponse addSong(UUID playlistId, UUID songId) {
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);

        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (playlistSongRepository.existsByPlaylistIdAndSongId(playlistId, songId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        PlaylistSong newNode = PlaylistSong.builder()
                .playlist(playlist)
                .song(song)
                .prevId(null)
                .nextId(null)
                .addedAt(java.time.LocalDateTime.now())
                .build();

        newNode = playlistSongRepository.save(newNode);
        linkedListService.append(playlistId, newNode);

        log.info("Song {} added to playlist {} by owner {}", songId, playlistId, userId);
        return toDetailResponse(playlist);
    }

    @Override
    public void removeSong(UUID playlistId, UUID songId) {
        UUID userId = currentUserId();
        requireOwner(playlistId, userId);

        PlaylistSong node = playlistSongRepository
                .findByPlaylistIdAndSongId(playlistId, songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        linkedListService.unlink(playlistId, node);
        playlistSongRepository.delete(node);

        log.info("Song {} removed from playlist {} by owner {}", songId, playlistId, userId);
    }

    @Override
    public PlaylistResponse reorder(UUID playlistId, ReorderRequest request) {
        UUID userId = currentUserId();
        Playlist playlist = requireOwner(playlistId, userId);

        PlaylistSong target = playlistSongRepository.findById(request.getDraggedId())
                .filter(ps -> ps.getPlaylist().getId().equals(playlistId))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        linkedListService.move(playlistId, target, request.getPrevId(), request.getNextId());

        return toDetailResponse(playlist);
    }
}
