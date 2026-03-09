package iuh.fit.se.recommendationservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.recommendationservice.client.MusicServiceClient;
import iuh.fit.se.recommendationservice.client.SocialServiceClient;
import iuh.fit.se.recommendationservice.dto.*;
import iuh.fit.se.recommendationservice.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final SocialServiceClient socialServiceClient;
    private final MusicServiceClient  musicServiceClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper        objectMapper;

    private static final Duration CACHE_TTL       = Duration.ofMinutes(10);
    private static final String   CACHE_KEY_PREFIX = "rec:profile:";

    // ----------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------

    @Override
    public UserProfileDto buildProfile(UUID userId) {
        String key = CACHE_KEY_PREFIX + userId;

        // Đọc cache
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                return objectMapper.readValue(cached, UserProfileDto.class);
            }
        } catch (Exception e) {
            log.warn("Profile cache read failed for {}: {}", userId, e.getMessage());
        }

        // Tính mới
        UserProfileDto profile = computeProfile(userId);

        // Ghi cache
        try {
            redisTemplate.opsForValue()
                    .set(key, objectMapper.writeValueAsString(profile), CACHE_TTL);
        } catch (Exception e) {
            log.warn("Profile cache write failed for {}: {}", userId, e.getMessage());
        }

        return profile;
    }

    @Override
    public void invalidateCache(UUID userId) {
        redisTemplate.delete(CACHE_KEY_PREFIX + userId);
    }

    // ----------------------------------------------------------------
    // Private — build profile
    // ----------------------------------------------------------------

    private UserProfileDto computeProfile(UUID userId) {
        // 1. Lấy listen history (200 bài, 90 ngày)
        List<ListenHistoryDto> history = fetchHistory(userId);

        // 2. Lấy song details để biết genres
        Set<UUID> songIds = history.stream()
                .map(ListenHistoryDto::getSongId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, SongDto> songMap = fetchSongMap(new ArrayList<>(songIds));

        // 3. Tính affinities
        Map<UUID, Double> genreAffinity  = computeGenreAffinity(history, songMap);
        Map<UUID, Double> artistAffinity = computeArtistAffinity(history);

        // 4. Recently listened (7 ngày → loại khỏi recommend)
        Set<UUID> recentSongs = history.stream()
                .filter(h -> h.getListenedAt() != null &&
                        h.getListenedAt().isAfter(Instant.now().minus(Duration.ofDays(7))))
                .map(ListenHistoryDto::getSongId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // 5. Followed artists
        Set<UUID> followedArtists = fetchFollowedArtists(userId);

        return UserProfileDto.builder()
                .userId(userId)
                .genreAffinity(genreAffinity)
                .artistAffinity(artistAffinity)
                .recentlyListenedSongIds(recentSongs)
                .followedArtistIds(followedArtists)
                .likedSongIds(new HashSet<>())
                .dislikedSongIds(new HashSet<>())
                .heartedSongIds(new HashSet<>())
                .build();
    }

    // ----------------------------------------------------------------
    // Private — affinity computations
    // ----------------------------------------------------------------

    /**
     * Genre affinity: cộng dồn trọng số có recency decay + duration ratio.
     * Normalize về [0, 1].
     */
    private Map<UUID, Double> computeGenreAffinity(
            List<ListenHistoryDto> history,
            Map<UUID, SongDto> songMap) {

        Map<UUID, Double> raw = new HashMap<>();
        Instant now = Instant.now();

        for (ListenHistoryDto listen : history) {
            SongDto song = songMap.get(listen.getSongId());
            if (song == null || song.getGenres() == null) continue;

            long daysAgo = Duration.between(
                    listen.getListenedAt() != null ? listen.getListenedAt() : now,
                    now
            ).toDays();

            // Recency decay: e^(-days/30)
            double recency = Math.exp(-daysAgo / 30.0);

            // Duration ratio: nghe càng nhiều bài → weight càng cao
            double durationRatio = 1.0;
            if (song.getDurationSeconds() != null && song.getDurationSeconds() > 0
                    && listen.getDurationSeconds() > 0) {
                durationRatio = Math.min(1.0,
                        (double) listen.getDurationSeconds() / song.getDurationSeconds());
            }

            double weight = recency * (0.5 + 0.5 * durationRatio);

            for (GenreDto genre : song.getGenres()) {
                raw.merge(genre.getId(), weight, Double::sum);
            }
        }

        return normalize(raw);
    }

    /**
     * Artist affinity: cộng dồn recency-weighted listen count.
     * Normalize về [0, 1].
     */
    private Map<UUID, Double> computeArtistAffinity(List<ListenHistoryDto> history) {
        Map<UUID, Double> raw = new HashMap<>();
        Instant now = Instant.now();

        for (ListenHistoryDto listen : history) {
            if (listen.getArtistId() == null) continue;

            long daysAgo = Duration.between(
                    listen.getListenedAt() != null ? listen.getListenedAt() : now,
                    now
            ).toDays();

            double weight = Math.exp(-daysAgo / 30.0);
            raw.merge(listen.getArtistId(), weight, Double::sum);
        }

        return normalize(raw);
    }

    private Map<UUID, Double> normalize(Map<UUID, Double> raw) {
        double max = raw.values().stream()
                .mapToDouble(Double::doubleValue).max().orElse(1.0);
        if (max > 0) {
            raw.replaceAll((k, v) -> v / max);
        }
        return raw;
    }

    // ----------------------------------------------------------------
    // Private — fetch helpers (fail-safe)
    // ----------------------------------------------------------------

    private List<ListenHistoryDto> fetchHistory(UUID userId) {
        try {
            ApiResponse<List<ListenHistoryDto>> response =
                    socialServiceClient.getListenHistory(userId, 200, 90);
            return response.getResult() != null ? response.getResult() : List.of();
        } catch (Exception e) {
            log.warn("Failed to fetch listen history for {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    private Map<UUID, SongDto> fetchSongMap(List<UUID> songIds) {
        if (songIds.isEmpty()) return Map.of();
        try {
            // Batch theo từng 50 để tránh URL quá dài
            Map<UUID, SongDto> result = new HashMap<>();
            List<List<UUID>> batches = partition(songIds, 50);
            for (List<UUID> batch : batches) {
                ApiResponse<List<SongDto>> response =
                        musicServiceClient.getSongsByIds(batch);
                if (response.getResult() != null) {
                    response.getResult().forEach(s -> result.put(s.getId(), s));
                }
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to fetch song map: {}", e.getMessage());
            return Map.of();
        }
    }

    private Set<UUID> fetchFollowedArtists(UUID userId) {
        try {
            ApiResponse<List<String>> response =
                    socialServiceClient.getFollowedArtistIds(userId);
            if (response.getResult() == null) return Set.of();
            return response.getResult().stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            log.warn("Failed to fetch followed artists for {}: {}", userId, e.getMessage());
            return Set.of();
        }
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }

    private Set<UUID> fetchSongIdSet(java.util.function.Supplier<List<String>> supplier) {
        try {
            List<String> ids = supplier.get();
            if (ids == null) return new HashSet<>();
            return ids.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            log.warn("Failed to fetch song id set: {}", e.getMessage());
            return new HashSet<>();
        }
    }
}