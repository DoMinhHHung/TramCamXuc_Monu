package iuh.fit.se.recommendationservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * recommendation-service chỉ SUBSCRIBE, không publish.
 *
 * Nó lắng nghe 2 exchange:
 *   1. song.listen.fanout.exchange  → cập nhật trending score real-time
 *      (music-service publish khi recordListen được gọi)
 *
 *   2. feed.content.fanout.exchange → cập nhật new-releases cache
 *      (music-service publish khi album được auto-publish)
 *
 * Hai exchange này đã được declare bởi music-service và social-service.
 * Chúng ta chỉ cần bind thêm queue của mình vào — RabbitMQ sẽ tự fanout.
 */
@Configuration
public class RabbitMQConfig {

    // ── Exchange names  ──────────────
    public static final String SONG_LISTEN_FANOUT_EXCHANGE  = "song.listen.fanout.exchange";
    public static final String FEED_CONTENT_FANOUT_EXCHANGE = "feed.content.fanout.exchange";

    // ── Queue names riêng của recommendation-service ─────────────────────────
    /** Nhận mỗi sự kiện nghe nhạc để cập nhật trending score */
    public static final String REC_TRENDING_QUEUE = "rec.trending.queue";

    /** Nhận sự kiện album mới publish để cập nhật new-releases cache */
    public static final String REC_NEW_RELEASES_QUEUE = "rec.new-releases.queue";

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }

    // ── Exchanges  ─────
    @Bean
    public FanoutExchange songListenFanoutExchange() {
        return new FanoutExchange(SONG_LISTEN_FANOUT_EXCHANGE, true, false);
    }

    @Bean
    public FanoutExchange feedContentFanoutExchange() {
        return new FanoutExchange(FEED_CONTENT_FANOUT_EXCHANGE, true, false);
    }

    // ── Queues ────────────────────────────────────────────────────────────────
    @Bean
    public Queue recTrendingQueue() {
        // durable = true: không mất message khi restart
        return QueueBuilder.durable(REC_TRENDING_QUEUE).build();
    }

    @Bean
    public Queue recNewReleasesQueue() {
        return QueueBuilder.durable(REC_NEW_RELEASES_QUEUE).build();
    }

    // ── Bindings ──────────────────────────────────────────────────────────────
    @Bean
    public Binding bindTrending(Queue recTrendingQueue,
                                FanoutExchange songListenFanoutExchange) {
        return BindingBuilder.bind(recTrendingQueue).to(songListenFanoutExchange);
    }

    @Bean
    public Binding bindNewReleases(Queue recNewReleasesQueue,
                                   FanoutExchange feedContentFanoutExchange) {
        return BindingBuilder.bind(recNewReleasesQueue).to(feedContentFanoutExchange);
    }
}