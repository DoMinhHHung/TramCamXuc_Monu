package iuh.fit.se.recommendationservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.recommendationservice.client.MlServiceClient;
import iuh.fit.se.recommendationservice.client.MusicInternalClient;
import iuh.fit.se.recommendationservice.config.RecommendationFetchExecutorConfig;
import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Điều phối toàn bộ quá trình recommendation cho một request.
 *
 * ── Flow cho GET /recommendations/home ──────────────────────────────────────
 *
 *   1. Parallel fetch (CompletableFuture):
 *      a. Python ML → CF recommendations
 *      b. Python ML → CB recommendations
 *      c. Social service → recently heard (for exclusion)
 *      d. Social service → disliked songs (hard filter)
 *      e. Trending ZSET → global top-20
 *      f. Social → friends listening
 *      g. Social → songs from followed artists
 *      h. Social → new releases
 *
 *   2. Hydrate: convert songIds → SongDetailDto qua music-service batch
 *
 *   3. Blend: gọi RecommendationRanker để mix CF + CB + trending + freshness
 *
 *   4. Assemble HomeRecommendationResponse (nhiều sections)
 *
 *   5. Cache kết quả vào Redis với TTL
 *
 * ── Tại sao parallel fetch? ──────────────────────────────────────────────────
 *   Nếu fetch tuần tự: 6 calls × ~100ms = 600ms latency
 *   Parallel:          max(all calls) ≈ 150ms
 *   → Cần @Async và CompletableFuture
 *
 * ── Cache strategy ───────────────────────────────────────────────────────────
 *   Key: rec:home:{userId}
 *   TTL: 15 phút
 *   Invalidation: chỉ expire tự nhiên (không invalidate on feedback — quá phức tạp,
 *   user không nhận ra sự khác biệt 15 phút)
 */
@Service
@Slf4j
public class RecommendationOrchestratorService {

    private final MlServiceClient                mlClient;
    private final MusicInternalClient            musicClient;
    private final SocialRecommendationService    socialService;
    private final TrendingScoreService           trendingService;
    private final RecommendationRanker           ranker;
    private final ColdStartHandler               coldStartHandler;
    private final RedisTemplate<String, Object>  redisTemplate;
    private final ObjectMapper                   objectMapper;
    private final RedisConfig.RecommendationProperties props;
    private final Executor                       fetchExecutor;

    public RecommendationOrchestratorService(
            MlServiceClient mlClient,
            MusicInternalClient musicClient,
            SocialRecommendationService socialService,
            TrendingScoreService trendingService,
            RecommendationRanker ranker,
            ColdStartHandler coldStartHandler,
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper,
            RedisConfig.RecommendationProperties props,
            @Qualifier(RecommendationFetchExecutorConfig.BEAN_NAME) Executor fetchExecutor) {
        this.mlClient = mlClient;
        this.musicClient = musicClient;
        this.socialService = socialService;
        this.trendingService = trendingService;
        this.ranker = ranker;
        this.coldStartHandler = coldStartHandler;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.props = props;
        this.fetchExecutor = fetchExecutor;
    }

    private static final int PARALLEL_FETCH_TIMEOUT_SEC = 5;

    // ── Home feed ─────────────────────────────────────────────────────────────

    /**
     * Tổng hợp toàn bộ home feed recommendation.
     * Cache-aside: check Redis trước, nếu miss thì build và cache.
     */
    public HomeRecommendationResponse getHomeFeed(UUID userId, boolean debug) {
        // Check cache
        if (!debug) { // debug mode luôn bypass cache để xem fresh data
            HomeRecommendationResponse cached = getCached(
                    RedisConfig.KEY_CACHE_HOME + userId,
                    new TypeReference<>() {});
            if (cached != null) {
                log.debug("[Orchestrator] Cache HIT for home feed userId={}", userId);
                return cached;
            }
        }

        log.debug("[Orchestrator] Cache MISS — building home feed for userId={}", userId);
        HomeRecommendationResponse response = buildHomeFeed(userId, debug);

        // Cache kết quả
        if (!debug) {
            cache(RedisConfig.KEY_CACHE_HOME + userId, response,
                    Duration.ofMinutes(props.getCache().getHomeTtlMinutes()));
        }

        return response;
    }

    /**
     * Xây dựng home feed bằng cách fetch song song tất cả nguồn dữ liệu.
     */
    private HomeRecommendationResponse buildHomeFeed(UUID userId, boolean debug) {
        int pageSize = props.getPage().getDefaultSize();

        // ── Phase 1a: Kick off all independent fetches on the pool (truly parallel) ──

        CompletableFuture<Set<String>> futureAlreadyHeard = CompletableFuture.supplyAsync(
                () -> socialService.getRecentlyHeardSongIds(userId), fetchExecutor);

        CompletableFuture<Set<String>> futureDisliked = CompletableFuture.supplyAsync(
                () -> socialService.getDislikedSongIds(userId), fetchExecutor);

        CompletableFuture<List<MlRecommendResponse.MlSongScore>> futureCf =
                CompletableFuture.supplyAsync(() -> mlClient.getCfRecommendations(userId, 60), fetchExecutor);

        CompletableFuture<List<MlRecommendResponse.MlSongScore>> futureCb =
                CompletableFuture.supplyAsync(() -> mlClient.getCbRecommendations(userId, 40), fetchExecutor);

        CompletableFuture<List<String>> futureTrending = CompletableFuture.supplyAsync(
                () -> trendingService.getGlobalTrending(pageSize * 2), fetchExecutor);

        CompletableFuture<List<RecommendedSongDto>> futureNewReleases = CompletableFuture.supplyAsync(
                () -> socialService.getNewReleasesFromFollowedArtists(userId, pageSize), fetchExecutor);

        waitAllParallelFetches(
                userId,
                futureAlreadyHeard, futureDisliked, futureCf, futureCb, futureTrending, futureNewReleases);

        Set<String> alreadyHeard = futureResult(futureAlreadyHeard, Collections.emptySet());
        Set<String> disliked     = futureResult(futureDisliked, Collections.emptySet());

        // ── Phase 1b: Social slices that depend on alreadyHeard ───────────────────

        CompletableFuture<List<RecommendedSongDto>> futureFriends = CompletableFuture.supplyAsync(
                () -> socialService.getFriendsListening(userId, pageSize, alreadyHeard), fetchExecutor);

        CompletableFuture<List<RecommendedSongDto>> futureArtists = CompletableFuture.supplyAsync(
                () -> socialService.getSongsFromFollowedArtists(userId, pageSize, alreadyHeard), fetchExecutor);

        waitAllParallelFetches(userId, futureFriends, futureArtists);

        // ── Phase 2: Collect ML / trending / social results (no blocking .get() chain) ─

        List<MlRecommendResponse.MlSongScore> cfScores  = futureResult(futureCf, Collections.emptyList());
        List<MlRecommendResponse.MlSongScore> cbScores  = futureResult(futureCb, Collections.emptyList());
        List<String>                          trendingIds = futureResult(futureTrending, Collections.emptyList());

        // ── Phase 3: Cold-start check & handling ─────────────────────────────

        int mlTotal = cfScores.size() + cbScores.size();
        boolean isColdStart = coldStartHandler.needsColdStart(mlTotal);

        List<RecommendedSongDto> forYouSection;

        if (isColdStart) {
            log.debug("[Orchestrator] Cold-start: mlResults={} for userId={}", mlTotal, userId);

            forYouSection = coldStartHandler.getColdStartRecommendations(
                    userId, pageSize, disliked);

            if (forYouSection.isEmpty() && !trendingIds.isEmpty()) {
                log.debug("[Orchestrator] Cold-start returned empty, using trending as forYou");
                Set<String> trendingFiltered = trendingIds.stream()
                        .filter(id -> !disliked.contains(id))
                        .collect(Collectors.toCollection(LinkedHashSet::new));
                Map<String, SongDetailDto> trendingDetails = hydrateSongsBatch(trendingFiltered);
                forYouSection = ranker.rankTrending(
                        trendingIds, trendingDetails, disliked, null, pageSize);
            }

        } else {
            // ── Phase 4: Hydrate ML candidates ──────────────────────────────
            Set<String> mlCandidateIds = new LinkedHashSet<>();
            cfScores.forEach(s -> mlCandidateIds.add(s.getSongId()));
            cbScores.forEach(s -> mlCandidateIds.add(s.getSongId()));

            Map<String, SongDetailDto> songDetails = hydrateSongsBatch(mlCandidateIds);

            // ── Phase 5: Blend ───────────────────────────────────────────────
            forYouSection = ranker.blend(
                    cfScores, cbScores, songDetails,
                    alreadyHeard, disliked, pageSize, debug);
        }

        // ── Phase 6: Build trending section ─────────────────────────────────

        List<RecommendedSongDto> trendingSection;
        if (!CollectionUtils.isEmpty(trendingIds)) {
            Set<String> trendingIds_filtered = trendingIds.stream()
                    .filter(id -> !disliked.contains(id))
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            Map<String, SongDetailDto> trendingDetails = hydrateSongsBatch(trendingIds_filtered);
            trendingSection = ranker.rankTrending(
                    trendingIds, trendingDetails, disliked, null, pageSize);
        } else {
            trendingSection = Collections.emptyList();
        }

        // ── Phase 7: Collect social sections ────────────────────────────────

        List<RecommendedSongDto> friendsSection     = futureResult(futureFriends, Collections.emptyList());
        List<RecommendedSongDto> artistsSection     = futureResult(futureArtists, Collections.emptyList());
        List<RecommendedSongDto> newReleasesSection = futureResult(futureNewReleases, Collections.emptyList());

        // ── Phase 8: Assemble response ───────────────────────────────────────

        List<String> recentlyPlayedIds = alreadyHeard.stream()
                .limit(20)
                .collect(Collectors.toList());

        return HomeRecommendationResponse.builder()
                .forYou(forYouSection)
                .trendingNow(trendingSection)
                .fromArtists(artistsSection)
                .newReleases(newReleasesSection)
                .friendsAreListening(friendsSection)
                .recentlyPlayedIds(recentlyPlayedIds)
                .build();
    }

    // ── Trending endpoint ─────────────────────────────────────────────────────

    /**
     * Trending toàn cầu (có cache riêng với TTL ngắn hơn).
     */
    public List<RecommendedSongDto> getTrending(UUID userId, int limit) {
        String cacheKey = RedisConfig.KEY_CACHE_HOME + "trending:global";
        List<RecommendedSongDto> cached = getCached(cacheKey, new TypeReference<>() {});
        if (cached != null) return cached.stream().limit(limit).collect(Collectors.toList());

        // User disliked songs — không show bài bị dislike dù đang trending
        Set<String> disliked = userId != null
                ? socialService.getDislikedSongIds(userId)
                : Collections.emptySet();

        List<String> trendingIds = trendingService.getGlobalTrending(limit * 2);
        Map<String, SongDetailDto> details = hydrateSongsBatch(new LinkedHashSet<>(trendingIds));
        List<RecommendedSongDto> result = ranker.rankTrending(
                trendingIds, details, disliked, null, limit);

        cache(cacheKey, result,
                Duration.ofMinutes(props.getCache().getTrendingTtlMinutes()));
        return result;
    }

    /**
     * Trending theo genre cụ thể.
     */
    public List<RecommendedSongDto> getTrendingByGenre(UUID userId, String genreId, int limit) {
        String cacheKey = "rec:cache:trending:genre:" + genreId;
        List<RecommendedSongDto> cached = getCached(cacheKey, new TypeReference<>() {});
        if (cached != null) return cached.stream().limit(limit).collect(Collectors.toList());

        Set<String> disliked = userId != null
                ? socialService.getDislikedSongIds(userId)
                : Collections.emptySet();

        List<String> ids = trendingService.getTrendingByGenre(genreId, limit * 2);
        Map<String, SongDetailDto> details = hydrateSongsBatch(new LinkedHashSet<>(ids));
        List<RecommendedSongDto> result = ranker.rankTrending(
                ids, details, disliked, genreId, limit);

        cache(cacheKey, result,
                Duration.ofMinutes(props.getCache().getTrendingTtlMinutes()));
        return result;
    }

    // ── Similar songs endpoint ────────────────────────────────────────────────

    /**
     * Bài hát tương tự — gọi Python CB similar endpoint.
     * Cache lâu hơn vì kết quả ít thay đổi (model update 6h/lần).
     */
    public List<RecommendedSongDto> getSimilarSongs(UUID userId, UUID songId, int limit) {
        String cacheKey = RedisConfig.KEY_CACHE_SIMILAR + songId;
        List<RecommendedSongDto> cached = getCached(cacheKey, new TypeReference<>() {});
        if (cached != null) return cached;

        Set<String> disliked = userId != null
                ? socialService.getDislikedSongIds(userId)
                : Collections.emptySet();

        List<MlRecommendResponse.MlSongScore> similarScores =
                mlClient.getSimilarSongs(songId, limit * 2);

        if (CollectionUtils.isEmpty(similarScores)) {
            // Fallback: lấy trending cùng genre của bài này
            return getTrendingFallbackForSong(songId, disliked, limit);
        }

        Set<String> candidateIds = similarScores.stream()
                .map(MlRecommendResponse.MlSongScore::getSongId)
                .filter(id -> !disliked.contains(id))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, SongDetailDto> details = hydrateSongsBatch(candidateIds);

        List<RecommendedSongDto> result = similarScores.stream()
                .filter(s -> !disliked.contains(s.getSongId()))
                .filter(s -> details.containsKey(s.getSongId()))
                .limit(limit)
                .map(s -> {
                    SongDetailDto d = details.get(s.getSongId());
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
                            .reason(RecommendedSongDto.ReasonType.SIMILAR_TO_LIKED)
                            .build();
                })
                .collect(Collectors.toList());

        cache(cacheKey, result,
                Duration.ofMinutes(props.getCache().getSimilarTtlMinutes()));
        return result;
    }

    // ── Social feed endpoint ──────────────────────────────────────────────────

    /**
     * Social-only feed: friends + followed artists (không có ML component).
     */
    public List<RecommendedSongDto> getSocialFeed(UUID userId, int limit) {
        String cacheKey = RedisConfig.KEY_CACHE_SOCIAL + userId;
        List<RecommendedSongDto> cached = getCached(cacheKey, new TypeReference<>() {});
        if (cached != null) return cached;

        Set<String> alreadyHeard = socialService.getRecentlyHeardSongIds(userId);
        Set<String> disliked     = socialService.getDislikedSongIds(userId);

        List<RecommendedSongDto> friends = socialService.getFriendsListening(
                userId, limit / 2, alreadyHeard);

        List<RecommendedSongDto> artists = socialService.getSongsFromFollowedArtists(
                userId, limit / 2, alreadyHeard);

        List<RecommendedSongDto> combined = Stream.concat(
                        friends.stream(), artists.stream())
                .filter(s -> !disliked.contains(s.getSongId()))
                .limit(limit)
                .collect(Collectors.toList());

        cache(cacheKey, combined,
                Duration.ofMinutes(props.getCache().getSocialTtlMinutes()));
        return combined;
    }

    // ── Feedback handler ──────────────────────────────────────────────────────

    /**
     * Nhận feedback từ user (skip, replay, dislike...) và invalidate cache.
     *
     * Với DISLIKE: lưu vào social-service (qua reaction API) là đủ.
     *              social-service đã có /social/reactions/dislike endpoint.
     *              Chúng ta chỉ cần invalidate cache home của user.
     *
     * Với SKIP/REPLAY: không cần persist — Python ML sẽ learn từ listen history.
     *                   Chỉ cần clear home cache để refresh lần tới.
     */
    public void processFeedback(UUID userId, FeedbackRequest feedback) {
        // Invalidate home cache để lần tới build fresh
        redisTemplate.delete(RedisConfig.KEY_CACHE_HOME + userId);
        redisTemplate.delete(RedisConfig.KEY_CACHE_SOCIAL + userId);

        log.info("[Orchestrator] Feedback {} for songId={} by userId={} — cache invalidated",
                feedback.getType(), feedback.getSongId(), userId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Batch hydrate songIds → SongDetailDto.
     * Chunk size 50 để tránh quá dài URL query string.
     * Preserve order từ input (quan trọng cho trending display).
     */
    private Map<String, SongDetailDto> hydrateSongsBatch(Set<String> songIds) {
        if (CollectionUtils.isEmpty(songIds)) return Collections.emptyMap();

        Map<String, SongDetailDto> result = new LinkedHashMap<>();
        List<List<String>> chunks = partition(new ArrayList<>(songIds), 50);

        for (List<String> chunk : chunks) {
            try {
                List<UUID> uuids = chunk.stream()
                        .map(UUID::fromString)
                        .collect(Collectors.toList());

                ApiResponse<List<SongDetailDto>> resp = musicClient.getSongsByIds(uuids);
                if (resp != null && resp.getResult() != null) {
                    resp.getResult().forEach(d -> result.put(d.getId(), d));
                }
            } catch (Exception e) {
                log.warn("[Orchestrator] Failed to hydrate chunk: {}", e.getMessage());
            }
        }

        return result;
    }

    /** Fallback khi similar songs từ ML không available */
    private List<RecommendedSongDto> getTrendingFallbackForSong(
            UUID songId, Set<String> disliked, int limit) {
        List<String> trendingIds = trendingService.getGlobalTrending(limit * 2);
        trendingIds.remove(songId.toString()); // đừng gợi ý chính bài đó
        Map<String, SongDetailDto> details = hydrateSongsBatch(new LinkedHashSet<>(trendingIds));
        return ranker.rankTrending(trendingIds, details, disliked, null, limit);
    }

    // ── Cache helpers ─────────────────────────────────────────────────────────

    private <T> T getCached(String key, TypeReference<T> type) {
        try {
            Object raw = redisTemplate.opsForValue().get(key);
            if (raw == null) return null;
            return objectMapper.convertValue(raw, type);
        } catch (Exception e) {
            log.trace("[Cache] Read failed for key={}: {}", key, e.getMessage());
            return null;
        }
    }

    private void cache(String key, Object value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            log.warn("[Cache] Write failed for key={}: {}", key, e.getMessage());
        }
    }

    /**
     * Wait until all futures complete or timeout. After a {@link TimeoutException}, slow tasks may still run;
     * {@link #futureResult} uses {@code !isDone()} so we do not block the HTTP thread on a late {@code .get()}.
     */
    @SafeVarargs
    private void waitAllParallelFetches(UUID userId, CompletableFuture<?>... futures) {
        try {
            CompletableFuture.allOf(futures).get(PARALLEL_FETCH_TIMEOUT_SEC, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("[Orchestrator] Timeout ({}s) waiting for parallel fetches userId={}",
                    PARALLEL_FETCH_TIMEOUT_SEC, userId);
        } catch (Exception e) {
            log.warn("[Orchestrator] Parallel fetch wait failed userId={}: {}", userId, e.getMessage());
        }
    }

    private <T> T futureResult(CompletableFuture<T> future, T defaultValue) {
        if (!future.isDone()) {
            return defaultValue;
        }
        try {
            return future.join();
        } catch (Exception e) {
            log.warn("[Orchestrator] Async fetch failed: {}", e.getMessage());
            return defaultValue;
        }
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }
}