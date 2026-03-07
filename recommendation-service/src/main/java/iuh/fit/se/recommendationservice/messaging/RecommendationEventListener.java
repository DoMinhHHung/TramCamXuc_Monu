package iuh.fit.se.recommendationservice.messaging;

import iuh.fit.se.recommendationservice.config.RabbitMQConfig;
import iuh.fit.se.recommendationservice.service.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationEventListener {

    private final CacheService cacheService;

    /**
     * Khi có bài mới publish → evict trending cache
     * Payload mẫu: { "songId": "...", "artistId": "...", "genreIds": [...] }
     */
    @RabbitListener(queues = RabbitMQConfig.SONG_PUBLISHED_QUEUE)
    public void onSongPublished(Map<String, Object> payload) {
        try {
            log.info("Song published event received: {}", payload.get("songId"));
            cacheService.evictTrending();
        } catch (Exception e) {
            log.error("Error handling song.published event: {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.ARTIST_FOLLOWED_QUEUE)
    public void onArtistFollowed(Map<String, Object> payload) {
        try {
            String userId = (String) payload.get("userId");
            if (userId != null) {
                log.info("Artist followed by user {}, evicting new-releases cache", userId);
                cacheService.evictNewReleases(userId);
            }
        } catch (Exception e) {
            log.error("Error handling artist.followed event: {}", e.getMessage());
        }
    }
}