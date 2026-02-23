package iuh.fit.se.music.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.dto.message.TranscodeSongMessage;
import iuh.fit.se.core.exception.*;
import iuh.fit.se.core.service.StorageService;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.entity.*;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.mapper.SongMapper;
import iuh.fit.se.music.repository.*;
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

    @Override
    @Transactional
    public SongResponse requestUploadUrl(SongCreateRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        if (artist.getStatus() != ArtistStatus.ACTIVE) {
            log.warn("Artist {} tried to upload but status is {}", artist.getStageName(), artist.getStatus());
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
        if (genres.size() != request.getGenreIds().size()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        UUID songId = UUID.randomUUID();
        String rawFileKey = String.format("raw/%s/%s.%s",
                artist.getId().toString(),
                songId.toString(),
                request.getFileExtension().replace(".", ""));

        String presignedUrl = storageService.generatePresignedUploadUrl(rawFileKey);

        Song song = Song.builder()
                .id(songId)
                .title(request.getTitle())
                .slug(generateSlug(request.getTitle(), songId))
                .primaryArtist(artist)
                .genres(new HashSet<>(genres))
                .rawFileKey(rawFileKey)
                .status(SongStatus.PENDING)
                .playCount(0L)
                .build();

        song = songRepository.save(song);

        SongResponse response = songMapper.toResponse(song);
        response.setUploadUrl(presignedUrl);

        log.info("Generated upload URL for song: {} by artist: {}", song.getTitle(), artist.getStageName());
        return response;
    }

    @Override
    @Transactional
    public void confirmUpload(UUID songId) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());

        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (!song.getPrimaryArtist().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.ARTIST_NOT_FOUND);
        }

        if (song.getStatus() != SongStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        song.setStatus(SongStatus.PROCESSING);
        songRepository.save(song);

        TranscodeSongMessage message = TranscodeSongMessage.builder()
                .songId(song.getId())
                .rawFileKey(song.getRawFileKey())
                .fileExtension(song.getRawFileKey().substring(song.getRawFileKey().lastIndexOf(".") + 1))
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MUSIC_EXCHANGE,
                RabbitMQConfig.TRANSCODE_ROUTING_KEY,
                message
        );

        log.info("Sent transcode request for song: {}", songId);
    }

    @Override
    public String getDownloadUrl(UUID songId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        if (authentication.getCredentials() instanceof Claims claims) {
            String featuresJson = claims.get("features", String.class);

            try {
                ObjectMapper mapper = new ObjectMapper();
                Map<String, Object> features = mapper.readValue(featuresJson, new TypeReference<Map<String, Object>>() {});

                if (features == null || !Boolean.TRUE.equals(features.get(SubscriptionConstants.FEATURE_DOWNLOAD))) {
                    log.warn("User {} tried to download song but doesn't have the download feature", userId);
                    throw new AppException(ErrorCode.UPGRADE_REQUIRED);
                }
            } catch (Exception e) {
                log.error("Failed to parse features JSON from JWT for user {}", userId, e);
                throw new AppException(ErrorCode.UPGRADE_REQUIRED);
            }
        } else {
            throw new AppException(ErrorCode.UPGRADE_REQUIRED);
        }

        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (song.getStatus() != SongStatus.COMPLETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String ext = ".mp3";
        String niceFileName = song.getSlug() + ext;
        String mp3ObjectKey = "download/" + song.getId() + "/song-320kbps.mp3";

        log.info("VIP User {} is downloading 320kbps file for song {}", userId, song.getId());

        return storageService.generatePresignedDownloadUrl(mp3ObjectKey, niceFileName);
    }

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
        return songRepository.findTrending(pageable)
                .map(songMapper::toResponse);
    }

    @Override
    public Page<SongResponse> getNewest(Pageable pageable) {
        return songRepository.findNewest(pageable)
                .map(songMapper::toResponse);
    }

    @Override
    public Page<SongResponse> getSongsByArtist(UUID artistId, Pageable pageable) {
        artistRepository.findById(artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return songRepository.findByArtistId(artistId, pageable)
                .map(songMapper::toResponse);
    }

    // ==================== PRIVATE HELPERS ====================

    private String generateSlug(String title, UUID songId) {
        try {
            String temp = Normalizer.normalize(title, Normalizer.Form.NFD);
            Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
            String slug = pattern.matcher(temp).replaceAll("").toLowerCase()
                    .replaceAll("[^a-z0-9\\s-]", "")
                    .replaceAll("\\s+", "-");

            if (slug.length() > 100) slug = slug.substring(0, 100);
            return slug + "-" + songId.toString().substring(0, 8);
        } catch (Exception e) {
            return songId.toString();
        }
    }

    /**
     * Đọc claim "features" từ JWT để quyết định trả về HLS variant nào.
     * - lossless / 320kbps → stream_320k.m3u8
     * - 256kbps            → stream_256k.m3u8
     * - 128kbps            → stream_128k.m3u8
     * - mặc định / free    → stream_64k.m3u8
     */
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

            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> features = mapper.readValue(featuresJson, new TypeReference<>() {});
            String quality = (String) features.getOrDefault(SubscriptionConstants.FEATURE_QUALITY, "64k");

            return switch (quality.toLowerCase()) {
                case "lossless", "320kbps" -> "320k";
                case "256kbps" -> "256k";
                case "128kbps" -> "128k";
                default -> "64k";
            };
        } catch (Exception e) {
            log.warn("Could not resolve stream quality from JWT, falling back to 64k");
            return "64k";
        }
    }

    /**
     * hlsMasterUrl trong DB = "hls/{songId}/master.m3u8"
     * Variant playlist FFmpeg tạo ra có tên: stream_64k.m3u8, stream_128k.m3u8, ...
     * Ta build URL trực tiếp đến variant tương ứng thay vì trả master.m3u8,
     * giúp client không cần parse master playlist.
     */
    private String buildStreamUrl(Song song, String quality) {
        String hlsDir = song.getHlsMasterUrl().replace("/master.m3u8", "");
        String variantKey = hlsDir + "/stream_" + quality + ".m3u8";
        return String.format("%s/%s/%s", minioPublicUrl, publicSongsBucket, variantKey);
    }
}
