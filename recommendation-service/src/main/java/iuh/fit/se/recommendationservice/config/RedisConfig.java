package iuh.fit.se.recommendationservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import lombok.Data;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties(RedisConfig.RecommendationProperties.class)
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        // Key luôn là String
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        // Value dùng Jackson để store object phức tạp (list songId, SongResponse...)
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Redis key naming convention trong recommendation-service:
     *
     * Trending ZSET:
     *   rec:trending:global              → ZSET songId → score (global top songs)
     *   rec:trending:genre:{genreId}     → ZSET songId → score (per genre)
     *
     * Result cache (kết quả blend đã tính toán):
     *   rec:home:{userId}                → cached home feed (List<SongResponse>)
     *   rec:social:{userId}              → cached social feed
     *   rec:similar:{songId}             → cached similar songs
     *   rec:new-releases:{userId}        → cached new releases from followed artists
     *
     * New releases raw data:
     *   rec:new-album:{artistId}         → albumId mới nhất của artist
     *   rec:all-new-releases             → ZSET albumId → publishedAt timestamp
     */

    // ── Redis key constants ───────────────────────────────────────────────────
    public static final String KEY_TRENDING_GLOBAL      = "rec:trending:global";
    public static final String KEY_TRENDING_GENRE       = "rec:trending:genre:";
    public static final String KEY_CACHE_HOME           = "rec:home:";
    public static final String KEY_CACHE_SOCIAL         = "rec:social:";
    public static final String KEY_CACHE_SIMILAR        = "rec:similar:";
    public static final String KEY_CACHE_NEW_RELEASES   = "rec:new-releases:";
    public static final String KEY_ALL_NEW_RELEASES     = "rec:all-new-releases";

    // ── Typed properties class bind từ application.yml ───────────────────────
    @ConfigurationProperties(prefix = "recommendation")
    @Data
    public static class RecommendationProperties {

        private BlendWeights blend = new BlendWeights();
        private TrendingConfig trending = new TrendingConfig();
        private CacheConfig cache = new CacheConfig();
        private PageConfig page = new PageConfig();

        @Data
        public static class BlendWeights {
            private double cfWeight      = 0.35;
            private double cbWeight      = 0.25;
            private double socialWeight  = 0.20;
            private double trendingWeight = 0.15;
            private double freshnessWeight = 0.05;
        }

        @Data
        public static class TrendingConfig {
            private double decayFactor   = 0.85;
            private int globalTopSize    = 200;
            private int genreTopSize     = 100;
        }

        @Data
        public static class CacheConfig {
            private int homeTtlMinutes     = 15;
            private int trendingTtlMinutes = 5;
            private int socialTtlMinutes   = 10;
            private int similarTtlMinutes  = 30;
        }

        @Data
        public static class PageConfig {
            private int defaultSize           = 20;
            private int maxSongsPerArtist     = 2;
            private int exclusionWindowDays   = 7;
        }
    }
}