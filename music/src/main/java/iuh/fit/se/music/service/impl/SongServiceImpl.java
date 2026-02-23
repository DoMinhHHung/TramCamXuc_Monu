package iuh.fit.se.music.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.dto.message.TranscodeSongMessage;
import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.core.service.StorageService;
import iuh.fit.se.music.dto.request.SongApprovalRequest;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.request.SongUpdateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.entity.Artist;
import iuh.fit.se.music.entity.Genre;
import iuh.fit.se.music.entity.Song;
import iuh.fit.se.music.enums.ApprovalStatus;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.enums.TranscodeStatus;
import iuh.fit.se.music.mapper.SongMapper;
import iuh.fit.se.music.repository.ArtistRepository;
import iuh.fit.se.music.repository.GenreRepository;
import iuh.fit.se.music.repository.SongRepository;
import iuh.fit.se.music.service.PlayCountSyncService;
import iuh.fit.se.music.service.SongService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SongServiceImpl implements SongService {

    private final SongRepository songRepository;
    private final ArtistRepository artistRepository;
    private final GenreRepository genreRepository;
    private final SongMapper songMapper;
    private final StorageService storageService;
    private final RabbitTemplate rabbitTemplate;
    private final PlayCountSyncService playCountSyncService;

    @Value("${minio.public-url}")
    private String minioPublicUrl;

    @Value("${minio.bucket.public-songs}")
    private String publicSongsBucket;

    // ==================== ARTIST ====================

    @Override
    @Transactional
    public SongResponse requestUploadUrl(SongCreateRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        if (artist.getStatus() != ArtistStatus.ACTIVE) {
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
        if (genres.size() != request.getGenreIds().size()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        // Xác định trạng thái ban đầu: chỉ chấp nhận PUBLIC hoặc DRAFT
        SongStatus initialStatus = SongStatus.PUBLIC;
        if (request.getInitialStatus() == SongStatus.DRAFT) {
            initialStatus = SongStatus.DRAFT;
        }

        UUID songId = UUID.randomUUID();
        String rawFileKey = String.format("raw/%s/%s.%s",
                artist.getId(), songId,
                request.getFileExtension().replace(".", ""));

        String presignedUrl = storageService.generatePresignedUploadUrl(rawFileKey);

        Song song = Song.builder()
                .id(songId)
                .title(request.getTitle())
                .slug(generateSlug(request.getTitle(), songId))
                .primaryArtist(artist)
                .genres(new HashSet<>(genres))
                .rawFileKey(rawFileKey)
                .status(initialStatus)
                .approvalStatus(ApprovalStatus.PENDING)
                .transcodeStatus(TranscodeStatus.PENDING)
                .playCount(0L)
                .build();

        song = songRepository.save(song);

        SongResponse response = songMapper.toResponse(song);
        response.setUploadUrl(presignedUrl);
        return response;
    }

    @Override
    @Transactional
    public void confirmUpload(UUID songId) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());

        Song song = songRepository.findByIdAndArtistUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (song.getTranscodeStatus() != TranscodeStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        song.setTranscodeStatus(TranscodeStatus.PROCESSING);
        songRepository.save(song);

        TranscodeSongMessage message = TranscodeSongMessage.builder()
                .songId(song.getId())
                .rawFileKey(song.getRawFileKey())
                .fileExtension(song.getRawFileKey().substring(song.getRawFileKey().lastIndexOf(".") + 1))
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.MUSIC_EXCHANGE, RabbitMQConfig.TRANSCODE_ROUTING_KEY, message);
        log.info("Sent transcode request for song: {}", songId);
    }

    @Override
    @Transactional
    public SongResponse updateSong(UUID songId, SongUpdateRequest request) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());

        Song song = songRepository.findByIdAndArtistUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (request.getTitle() != null) {
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
            validateStatusTransition(song, request.getStatus());
            SongStatus oldStatus = song.getStatus();
            song.setStatus(request.getStatus());

            // Nếu chuyển sang DELETED → xóa cứng logic
            if (request.getStatus() == SongStatus.DELETED) {
                songRepository.save(song);
                return songMapper.toResponse(song);
            }

            // Nếu từ DRAFT → PUBLIC/PRIVATE: reset approval để admin duyệt lại
            if (oldStatus == SongStatus.DRAFT && request.getStatus() != SongStatus.DRAFT) {
                song.setApprovalStatus(ApprovalStatus.PENDING);
                song.setRejectionReason(null);
                song.setReviewedAt(null);
                song.setReviewedBy(null);
            }

            // Nếu PUBLIC/PRIVATE đổi qua lại: giữ approval status hiện tại
        }

        return songMapper.toResponse(songRepository.save(song));
    }

    @Override
    @Transactional
    public void deleteSong(UUID songId) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());

        Song song = songRepository.findByIdAndArtistUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        song.setStatus(SongStatus.DELETED);
        songRepository.save(song);
        log.info("Song {} soft-deleted by artist {}", songId, userId);
    }

    @Override
    public Page<SongResponse> getMySONGs(Pageable pageable) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return songRepository.findAllByArtistUserId(userId, pageable)
                .map(songMapper::toResponse);
    }

    @Override
    public String getDownloadUrl(UUID songId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        if (authentication.getCredentials() instanceof Claims claims) {
            String featuresJson = claims.get("features", String.class);
            try {
                Map<String, Object> features = new ObjectMapper().readValue(featuresJson, new TypeReference<>() {});
                if (features == null || !Boolean.TRUE.equals(features.get(SubscriptionConstants.FEATURE_DOWNLOAD))) {
                    throw new AppException(ErrorCode.UPGRADE_REQUIRED);
                }
            } catch (AppException e) {
                throw e;
            } catch (Exception e) {
                throw new AppException(ErrorCode.UPGRADE_REQUIRED);
            }
        } else {
            throw new AppException(ErrorCode.UPGRADE_REQUIRED);
        }

        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        String mp3ObjectKey = "download/" + song.getId() + "/song-320kbps.mp3";
        log.info("User {} downloading song {}", userId, song.getId());
        return storageService.generatePresignedDownloadUrl(mp3ObjectKey, song.getSlug() + ".mp3");
    }

    // ==================== PUBLIC ====================

    @Override
    public SongResponse getSongById(UUID songId) {
        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
        return songMapper.toResponse(song);
    }

    @Override
    public String getStreamUrl(UUID songId) {
        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (song.getHlsMasterUrl() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String quality = resolveStreamQuality();
        return buildStreamUrl(song, quality);
    }

    @Override
    public void recordPlay(UUID songId) {
        if (!songRepository.existsById(songId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        playCountSyncService.increment(songId);
    }

    @Override
    public Page<SongResponse> searchSongs(String keyword, UUID genreId, UUID artistId, Pageable pageable) {
        return songRepository.searchSongs(keyword, genreId, artistId, pageable)
                .map(songMapper::toResponse);
    }

    @Override
    public Page<SongResponse> getTrending(Pageable pageable) {
        return songRepository.findTrending(pageable).map(songMapper::toResponse);
    }

    @Override
    public Page<SongResponse> getNewest(Pageable pageable) {
        return songRepository.findNewest(pageable).map(songMapper::toResponse);
    }

    @Override
    public Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable) {
        artistRepository.findById(artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return songRepository.findByArtistId(artistId, pageable).map(songMapper::toResponse);
    }

    // ==================== ADMIN ====================

    @Override
    public Page<SongResponse> getAdminQueue(ApprovalStatus approvalStatus, String keyword, Pageable pageable) {
        return songRepository.findForAdminQueue(approvalStatus, keyword, pageable)
                .map(songMapper::toResponse);
    }

    @Override
    @Transactional
    public SongResponse approveSong(UUID songId, UUID adminId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (song.getStatus() == SongStatus.DRAFT || song.getStatus() == SongStatus.DELETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (song.getTranscodeStatus() != TranscodeStatus.COMPLETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        song.setApprovalStatus(ApprovalStatus.APPROVED);
        song.setRejectionReason(null);
        song.setReviewedAt(LocalDateTime.now());
        song.setReviewedBy(adminId);

        log.info("Admin {} approved song {}", adminId, songId);
        return songMapper.toResponse(songRepository.save(song));
    }

    @Override
    @Transactional
    public SongResponse rejectSong(UUID songId, UUID adminId, SongApprovalRequest request) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (song.getStatus() == SongStatus.DRAFT || song.getStatus() == SongStatus.DELETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getRejectionReason() == null || request.getRejectionReason().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        song.setApprovalStatus(ApprovalStatus.REJECTED);
        song.setRejectionReason(request.getRejectionReason());
        song.setReviewedAt(LocalDateTime.now());
        song.setReviewedBy(adminId);

        log.info("Admin {} rejected song {} — reason: {}", adminId, songId, request.getRejectionReason());
        return songMapper.toResponse(songRepository.save(song));
    }

    // ==================== HELPERS ====================

    private void validateStatusTransition(Song song, SongStatus newStatus) {
        SongStatus current = song.getStatus();

        if (newStatus == SongStatus.DRAFT && current != SongStatus.DRAFT) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (current == SongStatus.DELETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
    }

    private String resolveStreamQuality() {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null) return "64k";

            Object credentials = authentication.getCredentials();
            String featuresJson = null;

            if (credentials instanceof Claims claims) {
                featuresJson = claims.get("features", String.class);
            } else if (credentials instanceof Map<?, ?> map) {
                Object raw = map.get("features");
                if (raw != null) featuresJson = raw.toString();
            }

            if (featuresJson == null) return "64k";

            Map<String, Object> features = new ObjectMapper().readValue(featuresJson, new TypeReference<>() {});
            String quality = (String) features.getOrDefault(SubscriptionConstants.FEATURE_QUALITY, "64k");

            return switch (quality.toLowerCase()) {
                case "lossless", "320kbps" -> "320k";
                case "256kbps" -> "256k";
                case "128kbps" -> "128k";
                default -> "64k";
            };
        } catch (Exception e) {
            log.warn("Could not resolve stream quality, falling back to 64k");
            return "64k";
        }
    }

    private String buildStreamUrl(Song song, String quality) {
        String hlsDir = song.getHlsMasterUrl().replace("/master.m3u8", "");
        String variantKey = hlsDir + "/stream_" + quality + ".m3u8";
        return String.format("%s/%s/%s", minioPublicUrl, publicSongsBucket, variantKey);
    }

    private String generateSlug(String title, UUID songId) {
        try {
            String temp = Normalizer.normalize(title, Normalizer.Form.NFD);
            String slug = Pattern.compile("\\p{InCombiningDiacriticalMarks}+")
                    .matcher(temp).replaceAll("")
                    .toLowerCase()
                    .replaceAll("[^a-z0-9\\s-]", "")
                    .replaceAll("\\s+", "-");
            if (slug.length() > 100) slug = slug.substring(0, 100);
            return slug + "-" + songId.toString().substring(0, 8);
        } catch (Exception e) {
            return songId.toString();
        }
    }
}