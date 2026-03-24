package iuh.fit.se.recommendationservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import iuh.fit.se.recommendationservice.client.SocialInternalClient;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Tổng hợp raw aggregation từ social-service + enrich song/artist details
 * từ music-service để build ListeningInsightsResponse hoàn chỉnh.
 *
 * Cache key: rec:insights:{userId}
 * TTL:       30 phút
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ListeningInsightsService {

    private final RestTemplate   restTemplate;
    private final MusicInternalClient musicClient;
    private final ObjectMapper   objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${social.service.url:http://social-service:8767}")
    private String socialServiceUrl;

    private static final Duration CACHE_TTL = Duration.ofMinutes(30);
    private static final String   CACHE_PREFIX = "rec:insights:";

    private static final Map<String, String> GENRE_MOOD_MAP = Map.ofEntries(
            Map.entry("Lo-fi",       "🌙 Chill & Focus"),
            Map.entry("Ambient",     "🌊 Thư giãn sâu"),
            Map.entry("Pop",         "✨ Năng động & Vui tươi"),
            Map.entry("R&B",         "💜 Cảm xúc & Sâu lắng"),
            Map.entry("Jazz",        "☕ Tinh tế & Sang trọng"),
            Map.entry("Rock",        "🔥 Mạnh mẽ & Cá tính"),
            Map.entry("Electronic",  "⚡ Sôi động & Hiện đại"),
            Map.entry("Classical",   "🎼 Tao nhã & Tập trung"),
            Map.entry("Hip-Hop",     "🎤 Tự tin & Mạnh mẽ"),
            Map.entry("Folk",        "🌿 Bình yên & Gần gũi")
    );

    // ─────────────────────────────────────────────────────────────────────────

    public ListeningInsightsResponse getInsights(UUID userId, int days) {
        String cacheKey = CACHE_PREFIX + userId + ":" + days;

        ListeningInsightsResponse cached = fromCache(cacheKey);
        if (cached != null) {
            log.debug("[Insights] Cache HIT userId={}", userId);
            return cached;
        }

        Map<String, Object> raw = fetchRawAggregation(userId, days);
        if (raw == null || raw.isEmpty()) {
            return emptyResponse();
        }

        ListeningInsightsResponse response = buildResponse(raw, days);

        toCache(cacheKey, response);

        return response;
    }


    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchRawAggregation(UUID userId, int days) {
        try {
            String url = socialServiceUrl
                    + "/internal/social/listen-insights/" + userId
                    + "?days=" + days;

            Map<?, ?> wrapper = restTemplate.getForObject(url, Map.class);
            if (wrapper == null) return Collections.emptyMap();

            Object result = wrapper.get("result");
            if (result instanceof Map) {
                return (Map<String, Object>) result;
            }
            return Collections.emptyMap();

        } catch (Exception e) {
            log.warn("[Insights] Failed to fetch raw aggregation userId={}: {}", userId, e.getMessage());
            return Collections.emptyMap();
        }
    }


    @SuppressWarnings("unchecked")
    private ListeningInsightsResponse buildResponse(Map<String, Object> raw, int days) {

        long totalSeconds  = toLong(raw.get("totalListeningSeconds"));
        long uniqueSongs   = toLong(raw.get("uniqueSongsCount"));
        int  currentStreak = toInt(raw.get("currentStreakDays"));
        int  longestStreak = toInt(raw.get("longestStreakDays"));

        List<Map<String, Object>> rawSongs =
                (List<Map<String, Object>>) raw.getOrDefault("topSongs", Collections.emptyList());

        List<ListeningInsightsResponse.SongStat> topSongs =
                buildTopSongs(rawSongs.stream().limit(5).collect(Collectors.toList()));

        List<Map<String, Object>> rawArtists =
                (List<Map<String, Object>>) raw.getOrDefault("topArtists", Collections.emptyList());

        List<ListeningInsightsResponse.ArtistStat> topArtists =
                buildTopArtists(rawArtists.stream().limit(5).collect(Collectors.toList()),
                        totalSeconds);

        List<ListeningInsightsResponse.GenreStat> topGenres =
                buildTopGenres(rawArtists, totalSeconds);

        List<Long> hourCounts = (List<Long>) raw.getOrDefault(
                "listenCountByHour", Collections.nCopies(24, 0L));

        List<ListeningInsightsResponse.HourlyListenCount> byHour = new ArrayList<>();
        for (int h = 0; h < Math.min(hourCounts.size(), 24); h++) {
            byHour.add(ListeningInsightsResponse.HourlyListenCount.builder()
                    .hour(h)
                    .count(toLong(hourCounts.get(h)))
                    .build());
        }

        String[] dayLabels = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        List<Long> dowCounts = (List<Long>) raw.getOrDefault(
                "listenCountByDayOfWeek", Collections.nCopies(7, 0L));

        List<ListeningInsightsResponse.DailyListenCount> byDow = new ArrayList<>();
        for (int d = 0; d < Math.min(dowCounts.size(), 7); d++) {
            byDow.add(ListeningInsightsResponse.DailyListenCount.builder()
                    .dayOfWeek(d)
                    .dayLabel(dayLabels[d])
                    .count(toLong(dowCounts.get(d)))
                    .build());
        }

        List<String> newArtists = (List<String>) raw.getOrDefault(
                "newlyDiscoveredArtistIds", Collections.emptyList());

        String dominantMood = topGenres.isEmpty() ? null
                : GENRE_MOOD_MAP.getOrDefault(topGenres.get(0).getGenreName(), "🎵 Đa dạng");

        return ListeningInsightsResponse.builder()
                .totalListeningMinutesLast30Days(totalSeconds / 60)
                .uniqueSongsLast30Days(uniqueSongs)
                .currentStreakDays(currentStreak)
                .longestStreakDays(longestStreak)
                .topGenres(topGenres)
                .topArtists(topArtists)
                .mostPlayedSongs(topSongs)
                .listeningByHour(byHour)
                .listeningByDayOfWeek(byDow)
                .newlyDiscoveredArtistIds(newArtists)
                .dominantMoodLabel(dominantMood)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Enrich top songs từ music-service
    // ─────────────────────────────────────────────────────────────────────────

    private List<ListeningInsightsResponse.SongStat> buildTopSongs(
            List<Map<String, Object>> rawSongs) {

        if (CollectionUtils.isEmpty(rawSongs)) return Collections.emptyList();

        List<UUID> songIds = rawSongs.stream()
                .map(m -> safeUuid(m.get("songId")))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        Map<String, SongDetailDto> detailMap = fetchSongDetails(songIds);

        return rawSongs.stream()
                .map(row -> {
                    String songId = safeStr(row.get("songId"));
                    SongDetailDto detail = detailMap.get(songId);
                    if (detail == null) return null;

                    String artistName = detail.getPrimaryArtist() != null
                            ? detail.getPrimaryArtist().getStageName() : "";

                    return ListeningInsightsResponse.SongStat.builder()
                            .songId(songId)
                            .title(detail.getTitle())
                            .thumbnailUrl(detail.getThumbnailUrl())
                            .artistStageName(artistName)
                            .playCount(toLong(row.get("playCount")))
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Enrich top artists từ music-service
    // ─────────────────────────────────────────────────────────────────────────

    private List<ListeningInsightsResponse.ArtistStat> buildTopArtists(
            List<Map<String, Object>> rawArtists,
            long totalSeconds) {

        if (CollectionUtils.isEmpty(rawArtists)) return Collections.emptyList();
        Map<String, List<SongDetailDto>> songsByArtist = fetchTopSongsByArtists(rawArtists, 20);

        // Lấy thông tin artist qua top songs của từng artist
        return rawArtists.stream()
                .map(row -> {
                    String artistId = safeStr(row.get("artistId"));
                    long   duration = toLong(row.get("totalDurationSeconds"));
                    long   plays    = toLong(row.get("playCount"));

                    String stageName = "";
                    String avatarUrl = "";
                    try {
                        List<SongDetailDto> artistSongs = songsByArtist.getOrDefault(artistId, Collections.emptyList());
                        if (!CollectionUtils.isEmpty(artistSongs)) {
                            SongDetailDto.ArtistInfo a = artistSongs.get(0).getPrimaryArtist();
                            if (a != null) {
                                stageName = a.getStageName();
                                avatarUrl = a.getAvatarUrl();
                            }
                        }
                    } catch (Exception e) {
                        log.trace("[Insights] Could not fetch artist {}: {}", artistId, e.getMessage());
                    }

                    return ListeningInsightsResponse.ArtistStat.builder()
                            .artistId(artistId)
                            .artistStageName(stageName)
                            .artistAvatarUrl(avatarUrl)
                            .playCount(plays)
                            .totalMinutes(duration / 60)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build top genres từ bài hát đã nghe nhiều nhất
    // Lấy genres của top songs rồi aggregate
    // ─────────────────────────────────────────────────────────────────────────

    private List<ListeningInsightsResponse.GenreStat> buildTopGenres(
            List<Map<String, Object>> rawArtists,
            long totalSeconds) {

        // Với catalog có genre per song, cần fetch songs của top artists
        // và aggregate genres. Để đơn giản + hiệu quả, lấy top 20 songs
        // của top 5 artists rồi tổng hợp genres.

        if (CollectionUtils.isEmpty(rawArtists)) return Collections.emptyList();
        Map<String, List<SongDetailDto>> songsByArtist = fetchTopSongsByArtists(rawArtists, 20);

        Map<String, Long> genreDuration = new LinkedHashMap<>();
        Map<String, String> genreNames  = new HashMap<>();

        for (Map<String, Object> artistRow : rawArtists.stream().limit(5).toList()) {
            String artistId   = safeStr(artistRow.get("artistId"));
            long   perArtistD = toLong(artistRow.get("totalDurationSeconds"));

            try {
                List<SongDetailDto> songs = songsByArtist.getOrDefault(artistId, Collections.emptyList());
                if (CollectionUtils.isEmpty(songs)) continue;

                // Phân bổ đều thời gian nghe của artist vào các genres của songs
                long perSongDuration = perArtistD / songs.size();
                for (SongDetailDto song : songs) {
                    if (CollectionUtils.isEmpty(song.getGenres())) continue;
                    long perGenre = perSongDuration / song.getGenres().size();
                    for (SongDetailDto.GenreInfo g : song.getGenres()) {
                        genreDuration.merge(g.getId(), perGenre, Long::sum);
                        genreNames.put(g.getId(), g.getName());
                    }
                }
            } catch (Exception e) {
                log.trace("[Insights] Genre build failed for artist {}: {}", artistId, e.getMessage());
            }
        }

        if (genreDuration.isEmpty()) return Collections.emptyList();

        long maxDuration = genreDuration.values().stream()
                .mapToLong(Long::longValue).max().orElse(1L);
        long total = Math.max(totalSeconds, 1L);

        return genreDuration.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> ListeningInsightsResponse.GenreStat.builder()
                        .genreId(e.getKey())
                        .genreName(genreNames.getOrDefault(e.getKey(), "Unknown"))
                        .totalMinutes(e.getValue() / 60)
                        .percentageOfTotal((int) (e.getValue() * 100 / total))
                        .build())
                .collect(Collectors.toList());
    }

    private Map<String, List<SongDetailDto>> fetchTopSongsByArtists(
            List<Map<String, Object>> rawArtists,
            int perArtistLimit) {
        if (CollectionUtils.isEmpty(rawArtists)) {
            return Collections.emptyMap();
        }

        Map<String, List<SongDetailDto>> result = new HashMap<>();
        Set<String> artistIds = rawArtists.stream()
                .limit(5)
                .map(row -> safeStr(row.get("artistId")))
                .filter(id -> !id.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (String artistId : artistIds) {
            try {
                ApiResponse<List<SongDetailDto>> resp =
                        musicClient.getSongsByArtist(UUID.fromString(artistId), perArtistLimit);
                if (resp != null && !CollectionUtils.isEmpty(resp.getResult())) {
                    result.put(artistId, resp.getResult());
                }
            } catch (Exception e) {
                log.trace("[Insights] Could not fetch songs for artist {}: {}", artistId, e.getMessage());
            }
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Batch fetch song details từ music-service
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, SongDetailDto> fetchSongDetails(List<UUID> ids) {
        if (CollectionUtils.isEmpty(ids)) return Collections.emptyMap();
        try {
            ApiResponse<List<SongDetailDto>> resp = musicClient.getSongsByIds(ids);
            if (resp == null || CollectionUtils.isEmpty(resp.getResult()))
                return Collections.emptyMap();
            return resp.getResult().stream()
                    .collect(Collectors.toMap(SongDetailDto::getId, d -> d));
        } catch (Exception e) {
            log.warn("[Insights] Song detail fetch failed: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cache helpers
    // ─────────────────────────────────────────────────────────────────────────

    private ListeningInsightsResponse fromCache(String key) {
        try {
            Object raw = redisTemplate.opsForValue().get(key);
            if (raw == null) return null;
            return objectMapper.convertValue(raw,
                    new TypeReference<ListeningInsightsResponse>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private void toCache(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, value, CACHE_TTL);
        } catch (Exception e) {
            log.warn("[Insights] Cache write failed: {}", e.getMessage());
        }
    }

    private ListeningInsightsResponse emptyResponse() {
        return ListeningInsightsResponse.builder()
                .totalListeningMinutesLast30Days(0L)
                .uniqueSongsLast30Days(0L)
                .currentStreakDays(0)
                .longestStreakDays(0)
                .topGenres(Collections.emptyList())
                .topArtists(Collections.emptyList())
                .mostPlayedSongs(Collections.emptyList())
                .listeningByHour(Collections.emptyList())
                .listeningByDayOfWeek(Collections.emptyList())
                .newlyDiscoveredArtistIds(Collections.emptyList())
                .dominantMoodLabel(null)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Type helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String safeStr(Object o)   { return o != null ? o.toString() : ""; }
    private UUID   safeUuid(Object o)  {
        try { return o != null ? UUID.fromString(o.toString()) : null; }
        catch (Exception e) { return null; }
    }
    private long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Long l)    return l;
        if (o instanceof Integer i) return i.longValue();
        if (o instanceof Number n)  return n.longValue();
        return 0L;
    }
    private int toInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Integer i) return i;
        if (o instanceof Number n)  return n.intValue();
        return 0;
    }
}