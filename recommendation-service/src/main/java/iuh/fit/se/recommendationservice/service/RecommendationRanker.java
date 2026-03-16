package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.MlRecommendResponse;
import iuh.fit.se.recommendationservice.dto.RecommendedSongDto;
import iuh.fit.se.recommendationservice.dto.SongDetailDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Tính final score cho mỗi bài hát bằng cách kết hợp 4 nguồn tín hiệu.
 *
 * ── Formula ──────────────────────────────────────────────────────────────────
 *
 *   finalScore = CF_score    * cfWeight        (0.35)
 *              + CB_score    * cbWeight        (0.25)
 *              + social_score * socialWeight   (0.20)
 *              + trending_score * trendingWeight (0.15)
 *              + freshness_score * freshnessWeight (0.05)
 *
 * ── Normalization ─────────────────────────────────────────────────────────────
 *   Mỗi nguồn score có range khác nhau (CF: 0..1, trending: 0..1000+).
 *   → Cần normalize về [0..1] trước khi blend.
 *   → Dùng min-max normalization trên tập input của từng nguồn.
 *
 * ── Diversity enforcement ─────────────────────────────────────────────────────
 *   Sau khi blend, apply "max N songs per artist" rule để tránh
 *   toàn bộ feed là 1 artist phổ biến.
 *
 * ── Post-filters ──────────────────────────────────────────────────────────────
 *   - Loại bỏ bài user đã nghe trong 7 ngày (alreadyHeardIds)
 *   - Loại bỏ bài user đã dislike (dislikedIds)
 *   - Chỉ giữ bài status=PUBLIC + transcodeStatus=COMPLETED (đã check ở Feign)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationRanker {

    private final TrendingScoreService trendingScoreService;
    private final RedisConfig.RecommendationProperties props;

    // ── Freshness config ──────────────────────────────────────────────────────

    /**
     * Freshness score = exp(-age_in_days / FRESHNESS_HALF_LIFE)
     * FRESHNESS_HALF_LIFE = 30 ngày → bài 30 ngày tuổi còn ~37% freshness
     */
    private static final double FRESHNESS_HALF_LIFE_DAYS = 30.0;

    // ── Main blend method ─────────────────────────────────────────────────────

    /**
     * Blend CF và CB scores, bổ sung trending và freshness, áp dụng diversity filter.
     *
     * @param cfScores      output từ Python CF endpoint  (songId → score)
     * @param cbScores      output từ Python CB endpoint  (songId → score)
     * @param songDetails   map songId → SongDetailDto (đã hydrate từ music-service)
     * @param alreadyHeard  bài user đã nghe → loại trừ
     * @param disliked      bài user đã dislike → loại trừ tuyệt đối
     * @param limit         số lượng cần trả về
     * @param debug         có kèm debug score không
     */
    public List<RecommendedSongDto> blend(
            List<MlRecommendResponse.MlSongScore> cfScores,
            List<MlRecommendResponse.MlSongScore> cbScores,
            Map<String, SongDetailDto>            songDetails,
            Set<String>                           alreadyHeard,
            Set<String>                           disliked,
            int                                   limit,
            boolean                               debug) {

        // Step 1: Thu thập tất cả candidate songIds từ cả CF và CB
        Set<String> candidates = new LinkedHashSet<>();
        cfScores.forEach(s -> candidates.add(s.getSongId()));
        cbScores.forEach(s -> candidates.add(s.getSongId()));

        if (candidates.isEmpty()) return Collections.emptyList();

        // Step 2: Build score maps từ CF và CB
        Map<String, Double> cfMap = toMap(cfScores);
        Map<String, Double> cbMap = toMap(cbScores);

        // Step 3: Normalize từng map về [0..1]
        Map<String, Double> cfNorm      = normalize(cfMap);
        Map<String, Double> cbNorm      = normalize(cbMap);
        Map<String, Double> trendingMap = buildTrendingMap(candidates);
        Map<String, Double> freshnessMap = buildFreshnessMap(candidates, songDetails);

        // Step 4: Tính final score cho từng candidate
        RedisConfig.RecommendationProperties.BlendWeights w = props.getBlend();

        List<ScoredSong> scored = candidates.stream()
                .filter(songId -> !disliked.contains(songId))   // hard filter: dislike
                .filter(songId -> !alreadyHeard.contains(songId)) // soft filter: already heard
                .filter(songDetails::containsKey)               // chỉ giữ bài đã hydrate
                .map(songId -> {
                    double cf        = cfNorm.getOrDefault(songId, 0.0);
                    double cb        = cbNorm.getOrDefault(songId, 0.0);
                    double trending  = trendingMap.getOrDefault(songId, 0.0);
                    double freshness = freshnessMap.getOrDefault(songId, 0.0);

                    // Nếu không có CF (user cold-start) → tăng trọng số CB
                    double cfW, cbW;
                    if (cfScores.isEmpty()) {
                        cfW = 0.0;
                        cbW = w.getCfWeight() + w.getCbWeight(); // redistribute CF weight sang CB
                    } else {
                        cfW = w.getCfWeight();
                        cbW = w.getCbWeight();
                    }

                    double finalScore = cf * cfW
                            + cb        * cbW
                            + trending  * w.getTrendingWeight()
                            + freshness * w.getFreshnessWeight();
                    // social score được add ở Orchestrator sau khi blend

                    return new ScoredSong(songId, finalScore, cf, cb, trending, freshness);
                })
                .sorted(Comparator.comparingDouble(ScoredSong::finalScore).reversed())
                .collect(Collectors.toList());

        // Step 5: Diversity filter — max N bài cùng artist
        int maxPerArtist = props.getPage().getMaxSongsPerArtist();
        Map<String, Integer> artistCount = new HashMap<>();
        List<ScoredSong> diversified = new ArrayList<>();

        for (ScoredSong ss : scored) {
            SongDetailDto detail = songDetails.get(ss.songId());
            if (detail == null) continue;

            String artistId = detail.getPrimaryArtist() != null
                    ? detail.getPrimaryArtist().getArtistId() : "unknown";

            int count = artistCount.getOrDefault(artistId, 0);
            if (count < maxPerArtist) {
                diversified.add(ss);
                artistCount.put(artistId, count + 1);
            }

            if (diversified.size() >= limit) break;
        }

        // Step 6: Convert sang RecommendedSongDto
        return diversified.stream()
                .map(ss -> {
                    SongDetailDto d = songDetails.get(ss.songId());
                    SongDetailDto.ArtistInfo a = d.getPrimaryArtist();

                    return RecommendedSongDto.builder()
                            .songId(d.getId())
                            .title(d.getTitle())
                            .slug(d.getSlug())
                            .thumbnailUrl(d.getThumbnailUrl())
                            .durationSeconds(d.getDurationSeconds())
                            .playCount(d.getPlayCount())
                            .artistId(a != null ? a.getArtistId() : null)
                            .artistStageName(a != null ? a.getStageName() : null)
                            .artistAvatarUrl(a != null ? a.getAvatarUrl() : null)
                            .reason(RecommendedSongDto.ReasonType.BECAUSE_YOU_LISTEN)
                            .debugScore(debug ? ss.finalScore() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Rank trending songs từ ZSET.
     * Không cần blend — chỉ cần hydrate và filter.
     *
     * @param trendingIds songIds theo thứ tự từ Redis ZSET (đã sorted)
     * @param songDetails hydrated song details
     * @param disliked    bài bị dislike → loại bỏ
     * @param genreId     nếu không null → context là "trending in genre X"
     */
    public List<RecommendedSongDto> rankTrending(
            List<String>               trendingIds,
            Map<String, SongDetailDto> songDetails,
            Set<String>               disliked,
            String                    genreId,
            int                       limit) {

        return trendingIds.stream()
                .filter(id -> !disliked.contains(id))
                .filter(songDetails::containsKey)
                .limit(limit)
                .map(id -> {
                    SongDetailDto d = songDetails.get(id);
                    SongDetailDto.ArtistInfo a = d.getPrimaryArtist();
                    return RecommendedSongDto.builder()
                            .songId(d.getId())
                            .title(d.getTitle())
                            .slug(d.getSlug())
                            .thumbnailUrl(d.getThumbnailUrl())
                            .durationSeconds(d.getDurationSeconds())
                            .playCount(d.getPlayCount())
                            .artistId(a != null ? a.getArtistId() : null)
                            .artistStageName(a != null ? a.getStageName() : null)
                            .artistAvatarUrl(a != null ? a.getAvatarUrl() : null)
                            .reason(genreId != null
                                    ? RecommendedSongDto.ReasonType.TRENDING_IN_GENRE
                                    : RecommendedSongDto.ReasonType.TRENDING_NOW)
                            .reasonContext(genreId)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Map<String, Double> toMap(List<MlRecommendResponse.MlSongScore> list) {
        return list.stream().collect(Collectors.toMap(
                MlRecommendResponse.MlSongScore::getSongId,
                MlRecommendResponse.MlSongScore::getScore,
                (a, b) -> a  // keep first on duplicate
        ));
    }

    /**
     * Min-max normalization: map all values to [0..1].
     * Nếu max == min → tất cả về 1.0 (tất cả bằng nhau).
     */
    private Map<String, Double> normalize(Map<String, Double> map) {
        if (map.isEmpty()) return Collections.emptyMap();

        double min = map.values().stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double max = map.values().stream().mapToDouble(Double::doubleValue).max().orElse(1.0);
        double range = max - min;

        if (range == 0) {
            return map.entrySet().stream().collect(
                    Collectors.toMap(Map.Entry::getKey, e -> 1.0));
        }

        return map.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> (e.getValue() - min) / range
        ));
    }

    /**
     * Build trending scores cho tập candidates, normalize về [0..1].
     */
    private Map<String, Double> buildTrendingMap(Set<String> candidates) {
        Map<String, Double> raw = new HashMap<>();
        for (String songId : candidates) {
            raw.put(songId, trendingScoreService.getTrendingScore(songId));
        }
        return normalize(raw);
    }

    /**
     * Build freshness scores dựa vào createdAt của song.
     *
     * freshness = exp(-age_days / HALF_LIFE)
     *   Bài vừa upload: 1.0
     *   Bài 30 ngày:    0.37
     *   Bài 90 ngày:    0.05
     *   Bài 180 ngày+:  ~0
     */
    private Map<String, Double> buildFreshnessMap(
            Set<String> candidates, Map<String, SongDetailDto> songDetails) {

        Map<String, Double> freshnessMap = new HashMap<>();
        Instant now = Instant.now();

        for (String songId : candidates) {
            SongDetailDto detail = songDetails.get(songId);
            double freshness = 0.5; // default khi không có createdAt

            if (detail != null && detail.getCreatedAt() != null) {
                try {
                    Instant createdAt = parseCreatedAt(detail.getCreatedAt());
                    long ageDays = ChronoUnit.DAYS.between(createdAt, now);
                    freshness = Math.exp(-ageDays / FRESHNESS_HALF_LIFE_DAYS);
                } catch (Exception e) {
                    log.trace("[Ranker] Could not parse createdAt for songId={}", songId);
                }
            }

            freshnessMap.put(songId, freshness);
        }

        return freshnessMap; // đã trong [0..1] tự nhiên, không cần normalize
    }

    private Instant parseCreatedAt(String createdAt) {
        // music-service trả về LocalDateTime dạng "2024-01-15T10:30:00"
        LocalDateTime ldt = LocalDateTime.parse(createdAt,
                DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        return ldt.toInstant(ZoneOffset.UTC);
    }

    // ── Internal record ───────────────────────────────────────────────────────

    record ScoredSong(
            String songId,
            double finalScore,
            double cfScore,
            double cbScore,
            double trendingScore,
            double freshnessScore
    ) {}
}