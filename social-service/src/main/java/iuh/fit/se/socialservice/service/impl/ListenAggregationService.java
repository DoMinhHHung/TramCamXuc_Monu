package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.repository.ListenHistoryAggregationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListenAggregationService {

    private final ListenHistoryAggregationRepository aggregationRepo;

    public Map<String, Object> aggregate(UUID userId, int days) {
        Map<String, Object> result = new HashMap<>();

        // ── Summary stats ──────────────────────────────────────────────────
        Map<String, Long> summary = aggregationRepo.getSummaryStats(userId, days);
        result.put("totalListeningSeconds", summary.getOrDefault("totalSeconds", 0L));
        result.put("uniqueSongsCount",      summary.getOrDefault("uniqueSongsCount", 0L));

        // ── Streak ─────────────────────────────────────────────────────────
        Map<String, Integer> streak = aggregationRepo.calculateStreak(userId);
        result.put("currentStreakDays", streak.getOrDefault("currentStreak", 0));
        result.put("longestStreakDays", streak.getOrDefault("longestStreak", 0));

        // ── Top songs ──────────────────────────────────────────────────────
        List<Map<String, Object>> topSongs = aggregationRepo
                .findTopSongsByPlayCount(userId, days, 10);
        result.put("topSongs", topSongs.stream()
                .map(row -> Map.of(
                        "songId",              safeStr(row.get("_id")),
                        "playCount",           safeLong(row.get("playCount")),
                        "totalDurationSeconds",safeLong(row.get("totalDurationSeconds"))
                ))
                .collect(Collectors.toList()));

        // ── Top artists ────────────────────────────────────────────────────
        List<Map<String, Object>> topArtists = aggregationRepo
                .findTopArtistsByDuration(userId, days, 10);
        result.put("topArtists", topArtists.stream()
                .map(row -> Map.of(
                        "artistId",             safeStr(row.get("_id")),
                        "totalDurationSeconds",  safeLong(row.get("totalDurationSeconds")),
                        "playCount",             safeLong(row.get("playCount"))
                ))
                .collect(Collectors.toList()));

        // ── Hourly distribution ────────────────────────────────────────────
        result.put("listenCountByHour",
                aggregationRepo.getListenCountByHour(userId, days));

        // ── Day-of-week distribution ───────────────────────────────────────
        result.put("listenCountByDayOfWeek",
                aggregationRepo.getListenCountByDayOfWeek(userId, days));

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
}