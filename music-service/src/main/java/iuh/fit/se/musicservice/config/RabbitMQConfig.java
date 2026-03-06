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

    // ── Exchanges ──────────────────────────────────────────────────────────────
    /** Gửi yêu cầu transcode + nhận callback từ transcode-service */
    public static final String MUSIC_EXCHANGE        = "music.exchange";
    /** Publish listen events cho analytics / trending worker */
    public static final String MUSIC_EVENT_EXCHANGE  = "music.event.exchange";
    /** Gửi sự kiện tới identity-service (artist register, subscription sync) */
    public static final String IDENTITY_EXCHANGE     = "identity.exchange";
    /** Gửi notification email */
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";

    // ── Queues ─────────────────────────────────────────────────────────────────
    public static final String TRANSCODE_SUCCESS_QUEUE = "transcode.success.queue";
    public static final String LISTEN_TRENDING_QUEUE   = "listen.trending.queue";

    // ── Routing keys ────────────────────────────────────────────────────────────
    public static final String TRANSCODE_ROUTING_KEY         = "song.transcode";
    public static final String TRANSCODE_SUCCESS_ROUTING_KEY = "song.transcode.success";
    public static final String SONG_LISTEN_ROUTING_KEY       = "song.listened";
    public static final String NOTIFICATION_EMAIL_KEY        = "notification.email";

    /**
     * music-service → identity-service: user vừa đăng ký artist profile.
     * identity-service lắng nghe key này để thêm ROLE_ARTIST cho user.
     */
    public static final String ARTIST_REGISTERED_ROUTING_KEY = "artist.registered";

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

    // ── Exchanges ──────────────────────────────────────────────────────────────
    @Bean
    public TopicExchange musicExchange() {
        return new TopicExchange(MUSIC_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange musicEventExchange() {
        return new TopicExchange(MUSIC_EVENT_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange identityExchange() {
        return new TopicExchange(IDENTITY_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE, true, false);
    }

    // ── Queues ─────────────────────────────────────────────────────────────────
    @Bean
    public Queue transcodeSuccessQueue() {
        return QueueBuilder.durable(TRANSCODE_SUCCESS_QUEUE).build();
    }

    @Bean
    public Queue listenTrendingQueue() {
        return QueueBuilder.durable(LISTEN_TRENDING_QUEUE).build();
    }

    // ── Bindings ──────────────────────────────────────────────────────────────
    @Bean
    public Binding bindTranscodeSuccess(Queue transcodeSuccessQueue,
                                        TopicExchange musicExchange) {
        return BindingBuilder.bind(transcodeSuccessQueue)
                .to(musicExchange).with(TRANSCODE_SUCCESS_ROUTING_KEY);
    }

    @Bean
    public Binding bindListenTrending(Queue listenTrendingQueue,
                                      TopicExchange musicEventExchange) {
        return BindingBuilder.bind(listenTrendingQueue)
                .to(musicEventExchange).with(SONG_LISTEN_ROUTING_KEY);
    }
}
