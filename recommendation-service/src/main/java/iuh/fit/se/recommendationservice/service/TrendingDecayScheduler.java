package iuh.fit.se.recommendationservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.recommendationservice.config.RabbitMQConfig;
import iuh.fit.se.recommendationservice.config.RedisConfig;
import iuh.fit.se.recommendationservice.dto.FeedContentEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/**
 * Các nhiệm vụ định kỳ:
 *
 * 1. Hourly decay — nhân tất cả trending/engagement scores × 0.85
 *    Sau 24h: 0.85^24 ≈ 3% còn lại → bài cũ tự rơi khỏi top
 *
 * 2. Velocity snapshot + recompute — mỗi giờ lưu snapshot và tính lại velocity
 *    velocity_normalized = sigmoid((score_now - score_24h_ago) / max(score_24h_ago, 1))
 *
 * 3. New releases consumer — nhận FeedContentEvent khi album mới publish
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrendingDecayScheduler {

    private final TrendingScoreService trendingScoreService;
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Chạy mỗi giờ đúng phút 0.
     *
     * Order of operations:
     *   1. Snapshot current scores (để velocity tuần tới có dữ liệu so sánh)
     *   2. Recompute velocity (dùng snapshot 24h trước)
     *   3. Decay tất cả listen + engagement ZSETs
     *   4. Prune new-releases cũ
     */
    @Scheduled(cron = "0 0 * * * *")
    public void decayTrendingScores() {
        long epochHour = Instant.now().getEpochSecond() / 3600;
        log.info("[Trending] Starting hourly decay (epochHour={})...", epochHour);
        int keysProcessed = 0;

        // ── Step 1: Snapshot trước khi decay ──────────────────────────────────
        // Snapshot phải chạy TRƯỚC decay để velocity không bị sai
        trendingScoreService.snapshotCurrentScores(epochHour);

        // ── Step 2: Recompute velocity dùng snapshot 24h trước ────────────────
        trendingScoreService.recomputeVelocityScores(epochHour);

        // ── Step 3: Decay listen ZSET (global + per-genre) ────────────────────
        trendingScoreService.decayAll(RedisConfig.KEY_TRENDING_GLOBAL);
        keysProcessed++;

        Set<String> genreKeys = trendingScoreService.getAllGenreTrendingKeys();
        for (String key : genreKeys) {
            trendingScoreService.decayAll(key);
            keysProcessed++;
        }

        // ── Step 4: Decay engagement ZSET ─────────────────────────────────────
        trendingScoreService.decayAll(TrendingScoreService.KEY_ENGAGEMENT_GLOBAL);
        keysProcessed++;

        // ── Step 5: Prune new-releases cũ hơn 30 ngày ────────────────────────
        pruneOldNewReleases();

        log.info("[Trending] Decay complete — {} ZSETs processed", keysProcessed);
    }

    /**
     * Nhận sự kiện album mới publish từ music-service.
     */
    @RabbitListener(queues = RabbitMQConfig.REC_NEW_RELEASES_QUEUE, ackMode = "MANUAL")
    public void handleNewRelease(
            FeedContentEventDto event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        try {
            if (event.getContentId() == null || event.getArtistId() == null) {
                log.warn("[NewReleases] Incomplete event: contentId={}, artistId={}",
                        event.getContentId(), event.getArtistId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            double score = Instant.now().getEpochSecond();

            redisTemplate.opsForZSet().add(
                    RedisConfig.KEY_ALL_NEW_RELEASES,
                    event.getContentId(),
                    score);

            String artistKey = "rec:new-releases:artist:" + event.getArtistId();
            redisTemplate.opsForZSet().add(artistKey, event.getContentId(), score);
            redisTemplate.expire(artistKey, Duration.ofDays(30));

            log.info("[NewReleases] Album {} by artist {} added to new-releases cache",
                    event.getContentId(), event.getArtistId());

            channel.basicAck(deliveryTag, false);

        } catch (Exception e) {
            log.error("[NewReleases] Failed to process: {}", e.getMessage(), e);
            try {
                channel.basicNack(deliveryTag, false, false);
            } catch (IOException ioEx) {
                log.error("[NewReleases] NACK failed: {}", ioEx.getMessage());
            }
        }
    }

    private void pruneOldNewReleases() {
        long cutoff = Instant.now().minus(Duration.ofDays(30)).getEpochSecond();
        Long removed = redisTemplate.opsForZSet()
                .removeRangeByScore(RedisConfig.KEY_ALL_NEW_RELEASES, 0, cutoff);
        if (removed != null && removed > 0) {
            log.debug("[NewReleases] Pruned {} old entries", removed);
        }
    }
}
