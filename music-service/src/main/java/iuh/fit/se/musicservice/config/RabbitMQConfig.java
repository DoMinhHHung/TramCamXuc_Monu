package iuh.fit.se.musicservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Central RabbitMQ topology for music-service.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * EXCHANGES
 * ──────────────────────────────────────────────────────────────────────────
 *  music.exchange        – transcode requests / callbacks
 *  music.event.exchange  – listen events for analytics / trending
 *  identity.exchange     – artist register, subscription sync
 *  notification.exchange – email notifications
 *  jamendo.exchange      – Jamendo import pipeline (NEW)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * JAMENDO IMPORT PIPELINE (NEW)
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  JamendoImportService  ──[jamendo.download.routing]──►  jamendo.download.queue
 *                                                               │
 *                                                   JamendoDownloadWorker
 *                                                               │ (on success)
 *                                                   ──[song.transcode]──► transcode-service
 *                                                               │ (on failure)
 *                                                   ──► jamendo.download.dlq
 *
 *  DLQ policy:
 *    - requeue = false on NACK → message moves to DLQ automatically via
 *      x-dead-letter-exchange / x-dead-letter-routing-key headers.
 *    - Operations team can inspect and replay DLQ messages manually.
 */
@Configuration
public class RabbitMQConfig {

    // ── Exchanges ──────────────────────────────────────────────────────────────
    public static final String MUSIC_EXCHANGE        = "music.exchange";
    public static final String MUSIC_EVENT_EXCHANGE  = "music.event.exchange";
    public static final String IDENTITY_EXCHANGE     = "identity.exchange";
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";

    /** Dedicated exchange for the Jamendo import pipeline. */
    public static final String JAMENDO_EXCHANGE      = "jamendo.exchange";

    // ── Queues ─────────────────────────────────────────────────────────────────
    public static final String TRANSCODE_SUCCESS_QUEUE = "transcode.success.queue";
    public static final String LISTEN_TRENDING_QUEUE   = "listen.trending.queue";

    /** Workers pull Jamendo track download jobs from this queue. */
    public static final String JAMENDO_DOWNLOAD_QUEUE  = "jamendo.download.queue";

    /**
     * Dead-letter queue for failed Jamendo download jobs.
     * Ops team monitors this queue for retries / investigation.
     */
    public static final String JAMENDO_DOWNLOAD_DLQ    = "jamendo.download.dlq";

    // ── Routing keys ────────────────────────────────────────────────────────────
    public static final String TRANSCODE_ROUTING_KEY         = "song.transcode";
    public static final String TRANSCODE_SUCCESS_ROUTING_KEY = "song.transcode.success";
    public static final String SONG_LISTEN_ROUTING_KEY       = "song.listened";
    public static final String NOTIFICATION_EMAIL_KEY        = "notification.email";
    public static final String ARTIST_REGISTERED_ROUTING_KEY = "artist.registered";

    /** Routing key used by JamendoImportService to enqueue download jobs. */
    public static final String JAMENDO_DOWNLOAD_ROUTING_KEY  = "jamendo.download.routing";

    /** Routing key for Jamendo DLQ binding on jamendo.exchange. */
    public static final String JAMENDO_DLQ_ROUTING_KEY       = "jamendo.download.dead";

    // ── Message Converter ──────────────────────────────────────────────────────
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

    /**
     * Topic exchange for the Jamendo import pipeline.
     * Durable = true (survives broker restart).
     * Auto-delete = false (stays even when no consumers).
     */
    @Bean
    public TopicExchange jamendoExchange() {
        return new TopicExchange(JAMENDO_EXCHANGE, true, false);
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

    /**
     * Main Jamendo download work queue.
     *
     * x-dead-letter-exchange    → jamendo.exchange
     * x-dead-letter-routing-key → jamendo.download.dead
     *
     * When a worker NACKs a message (requeue=false), RabbitMQ automatically
     * routes it to the DLQ via these headers — no extra code needed in the worker.
     */
    @Bean
    public Queue jamendoDownloadQueue() {
        return QueueBuilder.durable(JAMENDO_DOWNLOAD_QUEUE)
                .withArgument("x-dead-letter-exchange",    JAMENDO_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", JAMENDO_DLQ_ROUTING_KEY)
                .build();
    }

    /**
     * Dead-letter queue for Jamendo download failures.
     * No TTL — messages stay until ops team replays or clears them.
     */
    @Bean
    public Queue jamendoDownloadDlq() {
        return QueueBuilder.durable(JAMENDO_DOWNLOAD_DLQ).build();
    }

    // ── Bindings ───────────────────────────────────────────────────────────────
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

    /**
     * Bind the Jamendo download work queue to jamendo.exchange
     * using the download routing key.
     */
    @Bean
    public Binding bindJamendoDownload(Queue jamendoDownloadQueue,
                                       TopicExchange jamendoExchange) {
        return BindingBuilder.bind(jamendoDownloadQueue)
                .to(jamendoExchange).with(JAMENDO_DOWNLOAD_ROUTING_KEY);
    }

    /**
     * Bind the DLQ to jamendo.exchange so failed messages land correctly.
     */
    @Bean
    public Binding bindJamendoDownloadDlq(Queue jamendoDownloadDlq,
                                          TopicExchange jamendoExchange) {
        return BindingBuilder.bind(jamendoDownloadDlq)
                .to(jamendoExchange).with(JAMENDO_DLQ_ROUTING_KEY);
    }
}