package iuh.fit.se.recommendationservice.controller;

import iuh.fit.se.recommendationservice.dto.AdminTrendingAnalyticsDto;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.SongDetailDto;
import iuh.fit.se.recommendationservice.service.RecommendationOrchestratorService;
import iuh.fit.se.recommendationservice.service.TrendingScoreService;
import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin-only trending analytics.
 *
 * GET /admin/trending/analytics?limit=10
 *
 * Trả về top-N bài với full score breakdown:
 *   - listen / engagement / velocity / freshness contributions
 *   - velocity trend (RISING / STABLE / FALLING)
 *   - raw Redis scores để debug
 */
@RestController
@RequestMapping("/admin/trending")
@RequiredArgsConstructor
@Slf4j
public class AdminTrendingController {

    private final TrendingScoreService    trendingService;
    private final MusicInternalClient     musicClient;

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminTrendingAnalyticsDto>> getAnalytics(
            @RequestParam(defaultValue = "10") int limit) {

        int safeLimit = Math.min(limit, 50);
        int candidateCount = safeLimit * 3;

        // ── 1. Fetch candidates ──────────────────────────────────────────────
        List<String> listenIds = trendingService.getGlobalTrending(candidateCount);
        if (listenIds.isEmpty()) return ApiResponse.ok(Collections.emptyList());

        // ── 2. Batch score fetches ────────────────────────────────────────────
        Map<String, Double> engagementMap = trendingService.getEngagementScoresBatch(listenIds);
        Map<String, Double> velocityMap   = trendingService.getVelocityScoresBatch(listenIds);

        // ── 3. Hydrate song details ───────────────────────────────────────────
        Map<String, SongDetailDto> details = hydrateBatch(listenIds);

        // ── 4. Normalize ──────────────────────────────────────────────────────
        double maxListen = listenIds.stream()
                .mapToDouble(trendingService::getTrendingScore)
                .max().orElse(1.0);
        double maxEngagement = engagementMap.values().stream()
                .mapToDouble(Double::doubleValue).max().orElse(1.0);

        // ── 5. Score + sort ───────────────────────────────────────────────────
        record Entry(String songId, double combined, double listenNorm, double engageNorm,
                     double velocity, double freshness, double rawListen, double rawEngage) {}

        List<Entry> scored = listenIds.stream()
                .filter(details::containsKey)
                .map(songId -> {
                    SongDetailDto d = details.get(songId);
                    double rawListen  = trendingService.getTrendingScore(songId);
                    double rawEngage  = engagementMap.getOrDefault(songId, 0.0);
                    double listenNorm = maxListen     > 0 ? rawListen  / maxListen     : 0;
                    double engageNorm = maxEngagement > 0 ? rawEngage  / maxEngagement : 0;
                    double velocity   = velocityMap.getOrDefault(songId, 0.5);
                    double freshness  = TrendingScoreService.freshnessMultiplier(d.getCreatedAt());

                    double raw = listenNorm * 0.50 + engageNorm * 0.30 + velocity * 0.15;
                    double combined = raw * (1.0 + (freshness - 1.0) * 0.05);

                    return new Entry(songId, combined, listenNorm, engageNorm, velocity, freshness, rawListen, rawEngage);
                })
                .sorted(Comparator.comparingDouble(Entry::combined).reversed())
                .limit(safeLimit)
                .collect(Collectors.toList());

        // ── 6. Build DTOs ─────────────────────────────────────────────────────
        List<AdminTrendingAnalyticsDto> result = new ArrayList<>();
        for (int i = 0; i < scored.size(); i++) {
            Entry e  = scored.get(i);
            SongDetailDto d = details.get(e.songId());
            SongDetailDto.ArtistInfo a = d.getPrimaryArtist();

            double listenContrib  = e.listenNorm() * 0.50;
            double engageContrib  = e.engageNorm() * 0.30;
            double velContrib     = e.velocity()   * 0.15;
            double freshBonusPct  = (e.freshness() - 1.0) * 5.0; // % increase from freshness

            AdminTrendingAnalyticsDto.ScoreBreakdown breakdown = AdminTrendingAnalyticsDto.ScoreBreakdown.builder()
                    .totalScore(round2(e.combined()))
                    .listenContribution(round2(listenContrib))
                    .engagementContribution(round2(engageContrib))
                    .velocityContribution(round2(velContrib))
                    .freshnessMultiplier(e.freshness())
                    .freshnessBonusPct(round2(freshBonusPct))
                    .rawListenScore(round2(e.rawListen()))
                    .rawEngagementScore(round2(e.rawEngage()))
                    .build();

            String trend;
            String description;
            if (e.velocity() > 0.65)      { trend = "RISING";  description = "Tăng mạnh"; }
            else if (e.velocity() < 0.40) { trend = "FALLING"; description = "Đang giảm"; }
            else                          { trend = "STABLE";  description = "Ổn định"; }

            double rawVelocity = Math.log(e.velocity() / (1.0 - Math.max(e.velocity(), 0.001)));
            String growthPct = (rawVelocity >= 0 ? "+" : "") + Math.round(rawVelocity * 100) + "%";

            AdminTrendingAnalyticsDto.VelocityInfo velocityInfo = AdminTrendingAnalyticsDto.VelocityInfo.builder()
                    .trend(trend)
                    .velocityScore(round2(e.velocity()))
                    .description(description)
                    .growthRatePct(growthPct)
                    .build();

            result.add(AdminTrendingAnalyticsDto.builder()
                    .rank(i + 1)
                    .songId(d.getId())
                    .title(d.getTitle())
                    .artistStageName(a != null ? a.getStageName() : null)
                    .artistId(a != null ? a.getArtistId() : null)
                    .thumbnailUrl(d.getThumbnailUrl())
                    .playCount(d.getPlayCount())
                    .scoreBreakdown(breakdown)
                    .velocity(velocityInfo)
                    .build());
        }

        return ApiResponse.ok(result);
    }

    private Map<String, SongDetailDto> hydrateBatch(List<String> songIds) {
        Map<String, SongDetailDto> result = new LinkedHashMap<>();
        List<List<String>> chunks = partition(songIds, 50);
        for (List<String> chunk : chunks) {
            try {
                List<UUID> uuids = chunk.stream().map(UUID::fromString).collect(Collectors.toList());
                ApiResponse<List<SongDetailDto>> resp = musicClient.getSongsByIds(uuids);
                if (resp != null && resp.getResult() != null) {
                    resp.getResult().forEach(d -> result.put(d.getId(), d));
                }
            } catch (Exception e) {
                log.warn("[AdminTrending] Hydrate chunk failed: {}", e.getMessage());
            }
        }
        return result;
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> parts = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            parts.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return parts;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
