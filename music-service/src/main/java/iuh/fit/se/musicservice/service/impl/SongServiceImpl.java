package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.client.PaymentInternalClient;
import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.response.PaymentSubscriptionStatusResponse;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.mapper.SongMapper;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.SongService;
import iuh.fit.se.musicservice.service.ExternalMusicSearchService;
import iuh.fit.se.musicservice.util.RestPage;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SongServiceImpl implements SongService {

    private final SongRepository songRepository;
    private final GenreRepository genreRepository;
    private final ArtistRepository artistRepository;
    private final SongMapper songMapper;
    private final MinioStorageService storageService;
    private final RabbitTemplate rabbitTemplate;
    private final PlayCountSyncService playCountSyncService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final PaymentInternalClient paymentInternalClient;
    private final SubscriptionCacheWarmupService subscriptionCacheWarmupService;
    private final ExternalMusicSearchService externalMusicSearchService;

    // ── Cache constants (recommendation-service internal) ──────────────────────
    private static final String   CACHE_BATCH_PREFIX  = "rec:songs:batch:";
    private static final String   CACHE_ARTIST_PREFIX = "rec:artist:songs:";
    private static final String   CACHE_TRENDING = "rec:trending:songs";
    private static final String   CACHE_NEWEST   = "rec:newest:songs";
    private static final Duration CACHE_TTL    = Duration.ofMinutes(5);
    private static final Duration CACHE_BATCH_TTL     = Duration.ofMinutes(10);
    private static final Duration CACHE_ARTIST_TTL    = Duration.ofMinutes(15);

    // ── Helpers ────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String principal = null;
        try {
            principal = auth.getName();
            return UUID.fromString(principal);
        } catch (Exception e) {
            if (principal == null && auth.getPrincipal() != null) {
                try {
                    principal = auth.getPrincipal().toString();
                    return UUID.fromString(principal);
                } catch (Exception ignored) {}
            }
            log.error("[SongService] Unable to parse user id from authentication: {}", auth, e);
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
    }


    private String resolveStreamQuality() {
        Map<String, Object> features = loadSubscriptionFeatures(currentUserId());

        int maxBitrate = resolveMaxBitrate(features);
        if (maxBitrate >= 320) {
            return "320k";
        }
        if (maxBitrate >= 256) {
            return "256k";
        }
        if (maxBitrate >= 128) {
            return "128k";
        }

        return "64k";
    }

    private String buildStreamUrl(Song song, String quality) {
        String hlsDir = song.getHlsMasterUrl().replace("/master.m3u8", "");
        String variantKey = hlsDir + "/stream_" + quality + ".m3u8";
        return storageService.generatePresignedStreamUrl(variantKey);
    }

    private UUID tryGetCurrentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()
                    || "anonymousUser".equals(auth.getPrincipal())) return null;
            try {
                return UUID.fromString(auth.getName());
            } catch (Exception ignored) {
                return UUID.fromString(auth.getPrincipal().toString());
            }
        } catch (Exception e) {
            log.warn("[SongService] Failed to resolve current user id: {}", e.getMessage());
            return null;
        }
    }

    // ── Artist ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public SongResponse requestUploadUrl(SongCreateRequest request) {
        UUID userId = currentUserId();

        // Validate genres
        List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
        if (genres.size() != request.getGenreIds().size()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        UUID songId = UUID.randomUUID();
        String ext  = request.getFileExtension().replace(".", "").toLowerCase();
        String rawFileKey = String.format("raw/%s/%s.%s", userId, songId, ext);

        String presignedUrl = storageService.generatePresignedUploadUrl(rawFileKey);

        Song song = Song.builder()
                .id(songId)
                .title(request.getTitle())
                .slug(SlugUtils.generate(request.getTitle(), songId))
                .ownerUserId(userId)
                .primaryArtistId(artist.getId())
                .primaryArtistStageName(artist.getStageName())
                .primaryArtistAvatarUrl(artist.getAvatarUrl())
                .genres(new HashSet<>(genres))
                .rawFileKey(rawFileKey)
                .status(SongStatus.DRAFT)
                .transcodeStatus(TranscodeStatus.PENDING)
                .playCount(0L)
                .build();

        song = songRepository.save(song);

        SongResponse response = songMapper.toResponse(song);
        response.setUploadUrl(presignedUrl);
        log.info("Song {} created for user {}, presigned URL generated", songId, userId);
        return response;
    }

    @Override
    @Transactional
    public void confirmUpload(UUID songId) {
        UUID userId = currentUserId();

        Song song = songRepository.findByIdAndOwnerUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (song.getTranscodeStatus() != TranscodeStatus.PENDING) {
            throw new AppException(ErrorCode.SONG_INVALID_STATUS);
        }

        song.setTranscodeStatus(TranscodeStatus.PROCESSING);
        songRepository.save(song);

        // Gửi yêu cầu transcode sang transcode-service
        Map<String, Object> message = Map.of(
                "songId", song.getId().toString(),
                "rawFileKey", song.getRawFileKey(),
                "fileExtension", song.getRawFileKey()
                        .substring(song.getRawFileKey().lastIndexOf(".") + 1)
        );

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MUSIC_EXCHANGE,
                RabbitMQConfig.TRANSCODE_ROUTING_KEY,
                message
        );
        log.info("Transcode request sent for song: {}", songId);
    }

    @Override
    @Transactional
    public SongResponse updateSong(UUID songId, SongUpdateRequest request) {
        UUID userId = currentUserId();

        Song song = songRepository.findByIdAndOwnerUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            song.setTitle(request.getTitle());
        }

        if (request.getGenreIds() != null && !request.getGenreIds().isEmpty()) {
            List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
            if (genres.size() != request.getGenreIds().size()) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }
            song.setGenres(new HashSet<>(genres));
        }

        if (request.getStatus() != null) {
            // Artist chỉ được đổi PUBLIC ↔ PRIVATE
            SongStatus newStatus = request.getStatus();
            if (newStatus == SongStatus.DRAFT || newStatus == SongStatus.DELETED) {
                throw new AppException(ErrorCode.SONG_INVALID_STATUS);
            }
            if (song.getTranscodeStatus() != TranscodeStatus.COMPLETED) {
                throw new AppException(ErrorCode.SONG_NOT_READY);
            }
            song.setStatus(newStatus);
        }

        return songMapper.toResponse(songRepository.save(song));
    }

    @Override
    @Transactional
    public void deleteSong(UUID songId) {
        UUID userId = currentUserId();

        Song song = songRepository.findByIdAndOwnerUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        // Artist xóa → chuyển thành DELETED (soft delete nhẹ)
        song.setStatus(SongStatus.DELETED);
        song.setDeletedAt(LocalDateTime.now());
        song.setDeleteReason("Deleted by artist");
        song.setDeletedBy(userId);
        songRepository.save(song);
        log.info("Song {} soft-deleted by artist {}", songId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SongResponse> getMySongs(Pageable pageable) {
        UUID userId = currentUserId();
        return songRepository.findAllByOwnerUserId(userId, pageable)
                .map(songMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID songId) {
        UUID userId = currentUserId();

        // Kiểm tra subscription có hỗ trợ download không
        if (!hasFeature("download")) {
            throw new AppException(ErrorCode.UPGRADE_REQUIRED);
        }

        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        String mp3Key = "download/" + song.getId() + "/song-320kbps.mp3";
        log.info("User {} downloading song {}", userId, song.getId());
        return storageService.generatePresignedDownloadUrl(mp3Key, song.getSlug() + ".mp3");
    }

    // ── Public ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SongResponse getSongById(UUID songId) {
        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));
        return songMapper.toResponse(song);
    }

    @Override
    @Transactional(readOnly = true)
    public String getStreamUrl(UUID songId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (song.isDeleted()) {
            throw new AppException(ErrorCode.SONG_NOT_AVAILABLE);
        }
        if (song.getTranscodeStatus() != TranscodeStatus.COMPLETED) {
            throw new AppException(ErrorCode.SONG_NOT_READY);
        }

        // Bài PUBLIC thì ai cũng nghe được
        if (song.getStatus() == SongStatus.PUBLIC) {
            return buildStreamUrl(song, resolveStreamQuality());
        }

        // Bài PRIVATE hoặc DRAFT → chỉ owner hoặc admin
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        UUID currentUserId = UUID.fromString(auth.getName());
        boolean isOwner = song.getOwnerUserId().equals(currentUserId);
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isOwner || isAdmin) {
            return buildStreamUrl(song, resolveStreamQuality());
        }

        throw new AppException(ErrorCode.SONG_UNAUTHORIZED_ACCESS);
    }

    @Override
    @Transactional(readOnly = true)
    public void recordPlay(UUID songId) {
        if (!songRepository.existsById(songId)) {
            throw new AppException(ErrorCode.SONG_NOT_FOUND);
        }
        playCountSyncService.increment(songId);
    }

    @Override
    @Transactional(readOnly = true)
    public void recordListen(UUID songId, UUID playlistId, UUID albumId,
                             int durationSeconds, boolean completed) {
        Song song = songRepository.findByIdWithGenres(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        UUID currentUser = tryGetCurrentUserId();

        List<String> genreIds   = Collections.emptyList();
        List<String> genreNames = Collections.emptyList();
        if (song.getGenres() != null && !song.getGenres().isEmpty()) {
            genreIds   = song.getGenres().stream()
                    .map(g -> g.getId().toString())
                    .collect(Collectors.toList());
            genreNames = song.getGenres().stream()
                    .map(iuh.fit.se.musicservice.entity.Genre::getName)
                    .collect(Collectors.toList());
        }

        Map<String, Object> event = new HashMap<>();
        event.put("songId",          songId.toString());
        event.put("songTitle",        song.getTitle());
        event.put("artistId",         song.getPrimaryArtistId() != null
                ? song.getPrimaryArtistId().toString() : null);
        event.put("artistStageName",  song.getPrimaryArtistStageName());
        event.put("userId",           currentUser != null ? currentUser.toString() : null);
        event.put("playlistId",       playlistId  != null ? playlistId.toString()  : null);
        event.put("albumId",          albumId     != null ? albumId.toString()      : null);
        event.put("durationSeconds",  durationSeconds);
        event.put("completed",        completed);
        event.put("genreIds",         genreIds);
        event.put("genreNames",       genreNames);
        event.put("listenedAt",       Instant.now().toString());

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.SONG_LISTEN_FANOUT_EXCHANGE,
                "",
                event
        );

        log.debug("[Listen] songId={} userId={} duration={}s completed={} genres={}",
                songId, currentUser, durationSeconds, completed, genreNames);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SongResponse> searchSongs(String keyword, UUID genreId,
                                          UUID artistId, Pageable pageable, boolean includeExternal) {
        Page<SongResponse> localPage = songRepository.searchPublic(toKeywordPattern(keyword), genreId, artistId, pageable)
                .map(songMapper::toResponse);

        boolean canFetchExternal = includeExternal
                && pageable.getPageNumber() == 0
                && keyword != null
                && !keyword.isBlank();

        if (!canFetchExternal) {
            return localPage;
        }

        List<SongResponse> externalSongs = externalMusicSearchService.search(keyword, 10);
        if (externalSongs.isEmpty()) {
            return localPage;
        }

        List<SongResponse> merged = new ArrayList<>(localPage.getContent().size() + externalSongs.size());
        merged.addAll(localPage.getContent());
        merged.addAll(externalSongs);

        return new PageImpl<>(
                merged,
                pageable,
                localPage.getTotalElements() + externalSongs.size()
        );
    }

//    @Override
//    @Transactional(readOnly = true)
//    public Page<SongResponse> getTrending(Pageable pageable) {
//        return songRepository.findTrending(pageable).map(songMapper::toResponse);
//    }
    @Override
    @Transactional(readOnly = true)
    public Page<SongResponse> getTrending(Pageable pageable) {
        String cacheKey = CACHE_TRENDING + ":" + pageable.getPageNumber()
                + ":" + pageable.getPageSize();

        try {
            String cached = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached,
                        new TypeReference<RestPage<SongResponse>>() {});
            }
        } catch (Exception e) {
        }

        Page<SongResponse> result = songRepository.findTrending(pageable)
                .map(songMapper::toResponse);

        try {
            stringRedisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(result),
                    CACHE_TTL
            );
        } catch (Exception e) {
            log.warn("Cache write failed: {}", e.getMessage());
        }

        return result;
    }

//    @Override
//    @Transactional(readOnly = true)
//    public Page<SongResponse> getNewest(Pageable pageable) {
//        return songRepository.findNewest(pageable).map(songMapper::toResponse);
//    }

    @Override
    @Transactional(readOnly = true)
    public Page<SongResponse> getNewest(Pageable pageable) {
        String cacheKey = CACHE_NEWEST + ":" + pageable.getPageNumber()
                + ":" + pageable.getPageSize();
        try {
            String cached = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached,
                        new TypeReference<RestPage<SongResponse>>() {});
            }
        } catch (Exception ignored) {}

        Page<SongResponse> result = songRepository.findNewest(pageable)
                .map(songMapper::toResponse);

        try {
            stringRedisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(result),
                    Duration.ofMinutes(3)
            );
        } catch (Exception ignored) {}

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable) {
        return songRepository.findPublicByArtistId(artistId, pageable)
                .map(songMapper::toResponse);
    }

    // ── Recommendation-service internal endpoints ───────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<SongResponse> getSongsByIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyList();

        // Build a stable cache key from sorted IDs so order doesn't matter
        String cacheKey = CACHE_BATCH_PREFIX +
                ids.stream().map(UUID::toString).sorted().collect(Collectors.joining(",")).hashCode();
        try {
            String cached = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                List<SongResponse> result = objectMapper.readValue(
                        cached, new com.fasterxml.jackson.core.type.TypeReference<>() {});
                log.debug("Cache HIT batch ids hash={}", cacheKey);
                return result;
            }
        } catch (Exception e) {
            log.warn("Cache read failed for batch key: {}", e.getMessage());
        }

        List<Song> songs = songRepository.findPublicByIdIn(ids);
        // Preserve ML ranking order
        Map<UUID, Song> byId = songs.stream().collect(Collectors.toMap(Song::getId, s -> s));
        List<SongResponse> result = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(songMapper::toResponse)
                .collect(Collectors.toList());

        try {
            stringRedisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_BATCH_TTL);
        } catch (Exception e) {
            log.warn("Cache write failed for batch: {}", e.getMessage());
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SongResponse> getSongsByArtistTop(UUID artistId, int limit) {
        String cacheKey = CACHE_ARTIST_PREFIX + artistId + ":" + limit;
        try {
            String cached = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("Cache HIT artist songs artistId={}", artistId);
                return objectMapper.readValue(
                        cached, new com.fasterxml.jackson.core.type.TypeReference<>() {});
            }
        } catch (Exception e) {
            log.warn("Cache read failed for artist songs: {}", e.getMessage());
        }

        List<SongResponse> result = songRepository
                .findTopByArtistId(artistId, org.springframework.data.domain.PageRequest.of(0, limit))
                .stream()
                .map(songMapper::toResponse)
                .collect(Collectors.toList());

        try {
            stringRedisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_ARTIST_TTL);
        } catch (Exception e) {
            log.warn("Cache write failed for artist songs: {}", e.getMessage());
        }
        return result;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<SongResponse> getAdminSongs(String keyword, SongStatus status,
                                             boolean showDeleted, Pageable pageable) {
        return songRepository.findForAdmin(toKeywordPattern(keyword), status, showDeleted, pageable)
                .map(songMapper::toResponse);
    }

    @Override
    @Transactional
    public SongResponse softDeleteSong(UUID songId, String reason) {
        UUID adminId = currentUserId();

        Song song = songRepository.findByIdForAdmin(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (song.isDeleted()) {
            throw new AppException(ErrorCode.SONG_ALREADY_DELETED);
        }

        song.setStatus(SongStatus.DELETED);
        song.setDeletedAt(LocalDateTime.now());
        song.setDeletedBy(adminId);
        song.setDeleteReason(reason);

        log.info("Admin {} soft-deleted song {}: {}", adminId, songId, reason);
        return songMapper.toResponse(songRepository.save(song));
    }

    @Override
    @Transactional
    public SongResponse restoreSong(UUID songId) {
        UUID adminId = currentUserId();

        Song song = songRepository.findByIdForAdmin(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (!song.isDeleted()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        song.setStatus(SongStatus.PRIVATE); // Restore về PRIVATE, admin/artist quyết định public sau
        song.setDeletedAt(null);
        song.setDeletedBy(null);
        song.setDeleteReason(null);

        log.info("Admin {} restored song {}", adminId, songId);
        return songMapper.toResponse(songRepository.save(song));
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private String toKeywordPattern(String keyword) {
        if (keyword == null) {
            return null;
        }
        String normalized = keyword.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return "%" + normalized + "%";
    }

    private boolean hasFeature(String featureKey) {
        Map<String, Object> features = loadSubscriptionFeatures(currentUserId());
        Object value = features.get(featureKey);

        if (value == null && "download".equals(featureKey)) {
            value = features.get("canDownload");
        }

        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String text) {
            return Boolean.parseBoolean(text);
        }
        return false;
    }

    private Map<String, Object> loadSubscriptionFeatures(UUID userId) {
        if (userId == null) {
            return Collections.emptyMap();
        }

        String key = "user:subscription:" + userId;
        try {
            String payload = stringRedisTemplate.opsForValue().get(key);
            if (payload != null && !payload.isBlank()) {
                return objectMapper.readValue(payload, new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read subscription cache for userId={}", userId, e);
        }

        return fetchFromPaymentAndWarmCache(userId);
    }

    private Map<String, Object> fetchFromPaymentAndWarmCache(UUID userId) {
        try {
            PaymentSubscriptionStatusResponse status = paymentInternalClient.getSubscriptionStatus(userId);
            if (status != null && status.isActive() && status.getFeatures() != null) {
                subscriptionCacheWarmupService.warm(userId, status.getFeatures(), status.getExpiresAt());
                return status.getFeatures();
            }
            return Collections.emptyMap();
        } catch (Exception e) {
            log.error("Failed to fetch subscription status from payment-service for userId={}", userId, e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private int resolveMaxBitrate(Map<String, Object> features) {
        Object maxBitrate = features.get("maxBitrate");
        if (maxBitrate instanceof Number number) {
            return number.intValue();
        }
        if (maxBitrate instanceof String text) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
            }
        }

        Object quality = features.get("quality");
        if (quality instanceof String q) {
            return mapQualityToBitrate(q);
        }

        return 64;
    }

    private int mapQualityToBitrate(String quality) {
        return switch (quality.toLowerCase()) {
            case "lossless", "320kbps", "320k" -> 320;
            case "256kbps", "256k" -> 256;
            case "128kbps", "128k" -> 128;
            default -> 64;
        };
    }
}
