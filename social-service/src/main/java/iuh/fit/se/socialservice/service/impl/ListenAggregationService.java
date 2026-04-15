package iuh.fit.se.socialservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.socialservice.repository.ListenHistoryAggregationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListenAggregationService {

    private final ListenHistoryAggregationRepository aggregationRepo;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public Map<String, Object> aggregate(UUID userId, int days) {
        String cacheKey = "insights:" + userId + ":" + days;

        String cached = stringRedisTemplate.opsForValue().get(cacheKey);
        if (StringUtils.hasText(cached)) {
            try {
                return objectMapper.readValue(cached, new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("[ListenAgg] Failed to deserialize insights cache key={}: {}", cacheKey, e.getMessage());
            }
        }

        Map<String, Object> result = computeAggregate(userId, days);
        try {
            stringRedisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(result),
                    Duration.ofMinutes(30));
        } catch (Exception e) {
            log.warn("[ListenAgg] Failed to write insights cache key={}: {}", cacheKey, e.getMessage());
        }

        return result;
    }

    private Map<String, Object> computeAggregate(UUID userId, int days) {
        Map<String, Object> result = new HashMap<>();

        Map<String, Object> faceted = aggregationRepo.aggregateInsightsFacet(userId, days, 10);

        List<Map<String, Object>> summaryRows = asListOfMaps(faceted.get("summary"));
        Map<String, Object> summary = summaryRows.isEmpty() ? Collections.emptyMap() : summaryRows.get(0);

        // ── Summary stats ──────────────────────────────────────────────────
        result.put("totalListeningSeconds", safeLong(summary.get("totalSeconds")));
        result.put("uniqueSongsCount", safeLong(summary.get("uniqueSongsCount")));

        // ── Top songs ──────────────────────────────────────────────────────
        List<Map<String, Object>> topSongs = asListOfMaps(faceted.get("topSongs"));
        result.put("topSongs", topSongs.stream()
                .map(row -> Map.of(
                        "songId", safeStr(row.get("_id")),
                        "playCount", safeLong(row.get("playCount")),
                        "totalDurationSeconds", safeLong(row.get("totalDurationSeconds"))
                ))
                .collect(Collectors.toList()));

        // ── Top artists ────────────────────────────────────────────────────
        List<Map<String, Object>> topArtists = asListOfMaps(faceted.get("topArtists"));
        result.put("topArtists", topArtists.stream()
                .map(row -> Map.of(
                        "artistId", safeStr(row.get("_id")),
                        "totalDurationSeconds", safeLong(row.get("totalDurationSeconds")),
                        "playCount", safeLong(row.get("playCount"))
                ))
                .collect(Collectors.toList()));

        // ── Hourly distribution ────────────────────────────────────────────
        result.put("listenCountByHour", toHourSlots(asListOfMaps(faceted.get("listenByHour"))));

        // ── Day-of-week distribution ───────────────────────────────────────
        result.put("listenCountByDayOfWeek", toDayOfWeekSlots(asListOfMaps(faceted.get("listenByDayOfWeek"))));

        // ── Streak ─────────────────────────────────────────────────────────
        Map<String, Integer> streak = aggregationRepo.calculateStreak(userId);
        result.put("currentStreakDays", streak.getOrDefault("currentStreak", 0));
        result.put("longestStreakDays", streak.getOrDefault("longestStreak", 0));

        // ── Newly discovered artists (7 ngày) ─────────────────────────────
        result.put("newlyDiscoveredArtistIds",
                aggregationRepo.findNewlyDiscoveredArtists(userId, 7, 10));

        log.debug("[ListenAgg] Aggregated insights for userId={} days={}", userId, days);
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String safeStr(Object o) {
        return o != null ? o.toString() : "";
    }

    private long safeLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Long l)    return l;
        if (o instanceof Integer i) return i.longValue();
        if (o instanceof Number n)  return n.longValue();
        return 0L;
    }

        @SuppressWarnings("unchecked")
        private List<Map<String, Object>> asListOfMaps(Object raw) {
                if (!(raw instanceof List<?> list)) {
                        return Collections.emptyList();
                }
                return list.stream()
                                .filter(Map.class::isInstance)
                                .map(m -> (Map<String, Object>) m)
                                .collect(Collectors.toList());
        }

        private List<Long> toHourSlots(List<Map<String, Object>> rows) {
                Long[] slots = new Long[24];
                Arrays.fill(slots, 0L);
                for (Map<String, Object> row : rows) {
                        Object hourObj = row.get("_id");
                        if (!(hourObj instanceof Number hourNum)) continue;
                        int hour = hourNum.intValue();
                        if (hour >= 0 && hour < 24) {
                                slots[hour] = safeLong(row.get("count"));
                        }
                }
                return Arrays.asList(slots);
        }

        private List<Long> toDayOfWeekSlots(List<Map<String, Object>> rows) {
                Long[] slots = new Long[7];
                Arrays.fill(slots, 0L);
                for (Map<String, Object> row : rows) {
                        Object dowObj = row.get("_id");
                        if (!(dowObj instanceof Number dowNum)) continue;
                        int mongoDow = dowNum.intValue();
                        int idx = (mongoDow == 1) ? 6 : mongoDow - 2;
                        if (idx >= 0 && idx < 7) {
                                slots[idx] = safeLong(row.get("count"));
                        }
                }
                return Arrays.asList(slots);
        }
}