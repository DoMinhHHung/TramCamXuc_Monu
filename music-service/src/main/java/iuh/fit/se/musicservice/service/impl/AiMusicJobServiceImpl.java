package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.client.PaymentAiMusicInternalClient;
import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.internal.AiMusicJobRedisState;
import iuh.fit.se.musicservice.dto.internal.payment.InternalAiMusicQuotaResponse;
import iuh.fit.se.musicservice.dto.messaging.AiMusicGenerateMessage;
import iuh.fit.se.musicservice.dto.request.AiMusicCreateJobRequest;
import iuh.fit.se.musicservice.dto.response.AiMusicJobResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.SourceType;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.mapper.SongMapper;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.AiMusicJobService;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiMusicJobServiceImpl implements AiMusicJobService {

    private static final String REDIS_PREFIX = "ai:music:job:";
    private static final Duration JOB_TTL = Duration.ofMinutes(30);
    private static final ZoneId PERIOD_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final PaymentAiMusicInternalClient paymentAiMusicInternalClient;
    private final ArtistRepository artistRepository;
    private final GenreRepository genreRepository;
    private final SongRepository songRepository;
    private final SongMapper songMapper;
    private final MinioStorageService storageService;
    private final RabbitTemplate rabbitTemplate;

    public static String currentPeriodYm() {
        return YearMonth.now(PERIOD_ZONE).toString();
    }

    private UUID currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            return UUID.fromString(auth.getName());
        } catch (Exception e) {
            return UUID.fromString(auth.getPrincipal().toString());
        }
    }

    @Override
    public void assertAiMusicFeatureEnabled() {
        UUID userId = currentUserId();
        InternalAiMusicQuotaResponse q = paymentAiMusicInternalClient.getQuota(userId, currentPeriodYm());
        if (!q.isEnabled()) {
            throw new AppException(ErrorCode.AI_MUSIC_DISABLED);
        }
    }

    @Override
    public AiMusicJobResponse createJob(AiMusicCreateJobRequest request) {
        UUID userId = currentUserId();
        artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        if (request.getLyrics() != null && request.getLyrics().length() > 10000) {
            throw new AppException(ErrorCode.AI_MUSIC_LYRICS_TOO_LONG);
        }

        String periodYm = currentPeriodYm();
        InternalAiMusicQuotaResponse quota = paymentAiMusicInternalClient.getQuota(userId, periodYm);
        if (!quota.isEnabled()) {
            throw new AppException(ErrorCode.AI_MUSIC_DISABLED);
        }

        int duration = request.getDurationSeconds() <= 0 ? 60 : request.getDurationSeconds();
        duration = Math.min(duration, quota.getMaxDurationSeconds());
        duration = Math.min(600, Math.max(3, duration));

        if (quota.getRemainingGenerations() < 1) {
            throw new AppException(ErrorCode.AI_MUSIC_QUOTA_EXCEEDED);
        }
        if (quota.getRemainingTotalSeconds() < duration) {
            throw new AppException(ErrorCode.AI_MUSIC_QUOTA_EXCEEDED);
        }

        List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
        if (genres.size() != request.getGenreIds().size()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        UUID jobId = UUID.randomUUID();
        String previewKey = String.format("ai-preview/%s/%s.mp3", userId, jobId);

        List<String> genreIdStrs = request.getGenreIds().stream().map(UUID::toString).toList();
        List<String> genreNames = genres.stream().map(Genre::getName).toList();

        AiMusicJobRedisState state = AiMusicJobRedisState.builder()
                .jobId(jobId.toString())
                .userId(userId.toString())
                .periodYm(periodYm)
                .status("PENDING")
                .title(request.getTitle().trim())
                .genreIds(genreIdStrs)
                .genreNames(genreNames)
                .lyrics(request.getLyrics().trim())
                .stylePrompt(request.getStylePrompt() != null ? request.getStylePrompt().trim() : "")
                .durationSeconds(duration)
                .previewRawKey(previewKey)
                .build();

        try {
            String json = objectMapper.writeValueAsString(state);
            stringRedisTemplate.opsForValue().set(REDIS_PREFIX + jobId, json, JOB_TTL);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        AiMusicGenerateMessage msg = AiMusicGenerateMessage.builder()
                .jobId(jobId)
                .userId(userId)
                .periodYm(periodYm)
                .title(state.getTitle())
                .genreIds(genreIdStrs)
                .lyrics(state.getLyrics())
                .stylePrompt(state.getStylePrompt())
                .durationSeconds(duration)
                .genreNames(genreNames)
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MUSIC_EXCHANGE,
                RabbitMQConfig.AI_MUSIC_GENERATE_ROUTING,
                msg);

        return AiMusicJobResponse.builder()
                .jobId(jobId)
                .status("PENDING")
                .title(state.getTitle())
                .build();
    }

    @Override
    public AiMusicJobResponse getJob(UUID jobId) {
        UUID userId = currentUserId();
        AiMusicJobRedisState state = readState(jobId);
        if (!userId.toString().equals(state.getUserId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        String previewUrl = null;
        if ("READY".equals(state.getStatus()) && StringUtils.hasText(state.getPreviewRawKey())) {
            previewUrl = storageService.generatePresignedDownloadUrl(state.getPreviewRawKey(), "preview.mp3");
        }

        return AiMusicJobResponse.builder()
                .jobId(jobId)
                .status(state.getStatus())
                .title(state.getTitle())
                .previewUrl(previewUrl)
                .errorMessage(state.getErrorMessage())
                .build();
    }

    @Override
    @Transactional
    public SongResponse acceptJob(UUID jobId) {
        UUID userId = currentUserId();
        AiMusicJobRedisState state = readState(jobId);
        if (!userId.toString().equals(state.getUserId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        if (!"READY".equals(state.getStatus())) {
            throw new AppException(ErrorCode.AI_MUSIC_JOB_INVALID_STATE);
        }

        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        Set<Genre> genreSet = state.getGenreIds().stream()
                .map(UUID::fromString)
                .map(id -> genreRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND)))
                .collect(Collectors.toSet());

        UUID songId = UUID.randomUUID();
        String finalKey = String.format("raw/%s/%s.mp3", userId, songId);

        storageService.copyRawObject(state.getPreviewRawKey(), finalKey);
        storageService.deleteRawObject(state.getPreviewRawKey());

        Song song = Song.builder()
                .id(songId)
                .title(state.getTitle())
                .slug(SlugUtils.generate(state.getTitle(), songId))
                .ownerUserId(userId)
                .primaryArtistId(artist.getId())
                .primaryArtistStageName(artist.getStageName())
                .primaryArtistAvatarUrl(artist.getAvatarUrl())
                .genres(genreSet)
                .rawFileKey(finalKey)
                .coverFileKey(null)
                .status(SongStatus.DRAFT)
                .transcodeStatus(TranscodeStatus.PROCESSING)
                .playCount(0L)
                .sourceType(SourceType.LOCAL)
                .build();

        song = songRepository.save(song);

        Map<String, Object> transcodeMsg = Map.of(
                "songId", song.getId().toString(),
                "rawFileKey", song.getRawFileKey(),
                "fileExtension", "mp3"
        );
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MUSIC_EXCHANGE,
                RabbitMQConfig.TRANSCODE_ROUTING_KEY,
                transcodeMsg);

        stringRedisTemplate.delete(REDIS_PREFIX + jobId);

        log.info("AI music job {} accepted → song {}", jobId, songId);
        return songMapper.toResponse(song);
    }

    @Override
    public void rejectJob(UUID jobId) {
        UUID userId = currentUserId();
        AiMusicJobRedisState state = readState(jobId);
        if (!userId.toString().equals(state.getUserId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        if (StringUtils.hasText(state.getPreviewRawKey())) {
            storageService.deleteRawObject(state.getPreviewRawKey());
        }
        stringRedisTemplate.delete(REDIS_PREFIX + jobId);
        log.info("AI music job {} rejected by user", jobId);
    }

    private AiMusicJobRedisState readState(UUID jobId) {
        String json = stringRedisTemplate.opsForValue().get(REDIS_PREFIX + jobId);
        if (json == null) {
            throw new AppException(ErrorCode.AI_MUSIC_JOB_NOT_FOUND);
        }
        try {
            return objectMapper.readValue(json, AiMusicJobRedisState.class);
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_MUSIC_JOB_NOT_FOUND);
        }
    }
}
