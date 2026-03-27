package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.dto.response.LyricResponse;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.entity.SongLyric;
import iuh.fit.se.musicservice.enums.LyricFormat;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.SongLyricRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.LyricService;
import iuh.fit.se.musicservice.util.LyricParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j
public class LyricServiceImpl implements LyricService {

    private final SongLyricRepository lyricRepository;
    private final SongRepository      songRepository;
    private final StringRedisTemplate  redisTemplate;
    private final ObjectMapper         objectMapper;

    private static final String CACHE_PREFIX = "lyric:";
    private static final Duration CACHE_TTL   = Duration.ofHours(1);
    private static final long MAX_LYRIC_SIZE  = 1024 * 512;

    @Override
    @Transactional
    public LyricResponse uploadLyric(UUID songId, MultipartFile file) {
        UUID userId = currentUserId();

        Song song = songRepository.findByIdAndOwnerUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        if (file.getSize() > MAX_LYRIC_SIZE) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.matches("(?i).*\\.(lrc|srt|txt)$")) {
            throw new AppException(ErrorCode.LYRIC_INVALID_FILE);
        }

        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            LyricFormat format = LyricParser.detectFormat(
                    file.getOriginalFilename(), content);
            LyricParser.ParseResult parsed = LyricParser.parse(content, format);

            SongLyric lyric = lyricRepository.findBySongId(songId)
                    .orElseGet(() -> SongLyric.builder().songId(songId).build());

            lyric.setFormat(format);
            lyric.setRawContent(content);
            lyric.setSearchContent(parsed.searchContent);
            lyric.setParsedLinesJson(parsed.parsedLinesJson);
            lyricRepository.save(lyric);

            song.setLyricUrl("db://lyrics/" + songId);
            songRepository.save(song);

            redisTemplate.delete(CACHE_PREFIX + songId);

            log.info("Lyric uploaded for songId={} format={}", songId, format);
            return toResponse(lyric, parsed);

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to upload lyric for songId={}", songId, e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public LyricResponse getLyric(UUID songId) {
        String cacheKey = CACHE_PREFIX + songId;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, LyricResponse.class);
            }
        } catch (Exception e) {
            log.warn("Cache read failed for lyric songId={}", songId);
        }

        SongLyric lyric = lyricRepository.findBySongId(songId)
                .orElseThrow(() -> new AppException(ErrorCode.LYRIC_NOT_FOUND));

        LyricParser.ParseResult parsed;
        try {
            List<LyricParser.LyricLine> lines = objectMapper.readValue(
                    lyric.getParsedLinesJson(),
                    new TypeReference<>() {});
            parsed = new LyricParser.ParseResult(lines);
        } catch (Exception e) {
            parsed = LyricParser.parse(lyric.getRawContent(), lyric.getFormat());
        }

        LyricResponse response = toResponse(lyric, parsed);

        try {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(response),
                    CACHE_TTL);
        } catch (Exception e) {
            log.warn("Cache write failed for lyric songId={}", songId);
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> searchSongsByLyric(String keyword, int limit, int offset) {
        if (keyword == null || keyword.isBlank()) return Collections.emptyList();

        List<UUID> results = lyricRepository.searchByFullText(
                keyword.trim(), limit, offset);

        if (results.isEmpty()) {
            results = lyricRepository.searchByTrigram(
                    keyword.trim(), limit, offset);
        }

        return results;
    }

    @Override
    @Transactional
    public void deleteLyric(UUID songId) {
        UUID userId = currentUserId();
        Song song = songRepository.findByIdAndOwnerUserId(songId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        lyricRepository.deleteBySongId(songId);

        song.setLyricUrl(null);
        songRepository.save(song);

        redisTemplate.delete(CACHE_PREFIX + songId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private LyricResponse toResponse(SongLyric lyric, LyricParser.ParseResult parsed) {
        List<LyricResponse.LyricLine> lines = parsed.lines.stream()
                .map(l -> LyricResponse.LyricLine.builder()
                        .timeMs(l.getTimeMs())
                        .text(l.getText())
                        .build())
                .collect(Collectors.toList());

        return LyricResponse.builder()
                .songId(lyric.getSongId())
                .format(lyric.getFormat())
                .lines(lines)
                .build();
    }

    private UUID currentUserId() {
        return UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
    }
}