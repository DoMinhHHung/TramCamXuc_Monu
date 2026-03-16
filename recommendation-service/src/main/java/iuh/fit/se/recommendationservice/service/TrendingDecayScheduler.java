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
 * Hai nhiệm vụ:
 *
 * 1. Hourly decay — nhân tất cả trending scores với decayFactor.
 *    Chạy mỗi giờ đúng vào phút 0.
 *
 * 2. New releases consumer — nhận FeedContentEvent khi album mới publish
 *    và lưu vào Redis ZSET rec:all-new-releases (albumId → publishedAt).
 *    → RecommendationOrchestratorService đọc để build "New Releases" section.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrendingDecayScheduler {

    private final TrendingScoreService trendingScoreService;
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Chạy mỗi giờ: 0 0 * * * *
     *
     * Lý do decay hourly thay vì theo số lượt nghe:
     * - Đảm bảo bài viral ngày hôm qua không chiếm top mãi
     * - Đơn giản, predictable, không cần lưu timestamp của từng event
     *
     * Với decayFactor = 0.85:
     *   Sau 1h  → còn 85%  score
     *   Sau 8h  → còn 27%  score
     *   Sau 24h → còn 3%   score → về cuối bảng
     *   Sau 48h → < 0.01   → tự bị xóa khỏi ZSET
     */
    @Scheduled(cron = "0 0 * * * *")
    public void decayTrendingScores() {
        log.info("[Trending] Starting hourly decay...");
        int keysProcessed = 0;

        // Decay global trending
        trendingScoreService.decayAll(RedisConfig.KEY_TRENDING_GLOBAL);
        keysProcessed++;

        // Decay tất cả genre trending ZSETs
        Set<String> genreKeys = trendingScoreService.getAllGenreTrendingKeys();
        for (String key : genreKeys) {
            trendingScoreService.decayAll(key);
            keysProcessed++;
        }

        // Dọn new-releases cũ hơn 30 ngày
        pruneOldNewReleases();

        log.info("[Trending] Decay complete — {} ZSETs processed", keysProcessed);
    }

    /**
     * Nhận sự kiện album mới publish từ music-service.
     * Lưu vào ZSET với score = publishedAt epoch seconds → sort by thời gian mới nhất.
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

            // Score = timestamp (epoch seconds) → ZREVRANGE sẽ ra đúng thứ tự mới nhất trước
            double score = Instant.now().getEpochSecond();

            // Global new-releases ZSET
            redisTemplate.opsForZSet().add(
                    RedisConfig.KEY_ALL_NEW_RELEASES,
                    event.getContentId(),  // albumId
                    score
            );

            // Per-artist new-releases để recommendation có thể filter theo followed artists
            String artistKey = "rec:new-releases:artist:" + event.getArtistId();
            redisTemplate.opsForZSet().add(artistKey, event.getContentId(), score);
            // TTL 30 ngày cho per-artist key
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

    /**
     * Xóa entries cũ hơn 30 ngày khỏi rec:all-new-releases.
     * Score trong ZSET là epoch seconds → cutoff = now - 30 ngày.
     */
    private void pruneOldNewReleases() {
        long cutoff = Instant.now().minus(Duration.ofDays(30)).getEpochSecond();
        Long removed = redisTemplate.opsForZSet()
                .removeRangeByScore(RedisConfig.KEY_ALL_NEW_RELEASES, 0, cutoff);
        if (removed != null && removed > 0) {
            log.debug("[NewReleases] Pruned {} old entries from new-releases", removed);
        }
    }
}