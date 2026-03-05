package iuh.fit.se.musicservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ── Exchanges ──────────────────────────────────────────────
    public static final String MUSIC_EXCHANGE       = "music.exchange";
    public static final String MUSIC_EVENT_EXCHANGE = "music.event.exchange";
    public static final String IDENTITY_EXCHANGE    = "identity.exchange";

    // ── Queues ─────────────────────────────────────────────────
    public static final String TRANSCODE_QUEUE         = "transcode.queue";
    public static final String TRANSCODE_SUCCESS_QUEUE = "transcode.success.queue";
    public static final String LISTEN_TRENDING_QUEUE   = "listen.trending.queue";

    /** Nhận event artist đã đăng ký từ identity-service */
    public static final String MUSIC_ARTIST_ROLE_QUEUE = "music.artist-registered.queue";

    /** Nhận event subscription thay đổi */
    public static final String MUSIC_SUBSCRIPTION_QUEUE = "music.subscription.queue";

    /** Queue for song soft-deleted events (consumed by social-service, etc.) */
    public static final String SONG_DELETED_QUEUE = "song.deleted.queue";

    // ── Routing Keys ────────────────────────────────────────────
    public static final String TRANSCODE_ROUTING_KEY         = "song.transcode";
    public static final String TRANSCODE_SUCCESS_ROUTING_KEY = "song.transcode.success";
    public static final String SONG_LISTEN_ROUTING_KEY       = "song.listen";
    public static final String ROUTING_ARTIST_REGISTERED     = "artist.registered";
    public static final String ROUTING_SUBSCRIPTION_ACTIVE   = "subscription.active";

    /** Routing key for song soft-deleted events */
    public static final String SONG_SOFT_DELETED_ROUTING_KEY = "song.soft-deleted";

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate t = new RabbitTemplate(cf);
        t.setMessageConverter(jsonMessageConverter());
        return t;
    }

    // ── Exchanges ───────────────────────────────────────────────
    @Bean public TopicExchange musicExchange()      { return new TopicExchange(MUSIC_EXCHANGE); }
    @Bean public TopicExchange musicEventExchange() { return new TopicExchange(MUSIC_EVENT_EXCHANGE); }
    @Bean public TopicExchange identityExchange()   { return new TopicExchange(IDENTITY_EXCHANGE); }

    // ── Queues ──────────────────────────────────────────────────
    @Bean public Queue transcodeSuccessQueue()    { return QueueBuilder.durable(TRANSCODE_SUCCESS_QUEUE).build(); }
    @Bean public Queue listenTrendingQueue()      { return QueueBuilder.durable(LISTEN_TRENDING_QUEUE).build(); }
    @Bean public Queue musicArtistRoleQueue()     { return QueueBuilder.durable(MUSIC_ARTIST_ROLE_QUEUE).build(); }
    @Bean public Queue musicSubscriptionQueue()   { return QueueBuilder.durable(MUSIC_SUBSCRIPTION_QUEUE).build(); }
    @Bean public Queue songDeletedQueue()         { return QueueBuilder.durable(SONG_DELETED_QUEUE).build(); }

    // ── Bindings ────────────────────────────────────────────────
    @Bean
    public Binding bindTranscodeSuccess(Queue transcodeSuccessQueue, TopicExchange musicExchange) {
        return BindingBuilder.bind(transcodeSuccessQueue)
                .to(musicExchange).with(TRANSCODE_SUCCESS_ROUTING_KEY);
    }

    @Bean
    public Binding bindListenTrending(Queue listenTrendingQueue, TopicExchange musicEventExchange) {
        return BindingBuilder.bind(listenTrendingQueue)
                .to(musicEventExchange).with(SONG_LISTEN_ROUTING_KEY);
    }

    @Bean
    public Binding bindArtistRole(Queue musicArtistRoleQueue, TopicExchange identityExchange) {
        return BindingBuilder.bind(musicArtistRoleQueue)
                .to(identityExchange).with(ROUTING_ARTIST_REGISTERED);
    }

    @Bean
    public Binding bindSubscription(Queue musicSubscriptionQueue, TopicExchange identityExchange) {
        return BindingBuilder.bind(musicSubscriptionQueue)
                .to(identityExchange).with(ROUTING_SUBSCRIPTION_ACTIVE);
    }

    @Bean
    public Binding bindSongDeleted(Queue songDeletedQueue, TopicExchange musicEventExchange) {
        return BindingBuilder.bind(songDeletedQueue)
                .to(musicEventExchange).with(SONG_SOFT_DELETED_ROUTING_KEY);
    }
}