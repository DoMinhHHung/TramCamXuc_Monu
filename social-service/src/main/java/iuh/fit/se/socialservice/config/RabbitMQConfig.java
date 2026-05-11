package iuh.fit.se.socialservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.interceptor.RetryOperationsInterceptor;

@Configuration
public class RabbitMQConfig {

    public static final String SONG_LISTEN_FANOUT_EXCHANGE = "song.listen.fanout.exchange";

    // ── Main queues ───────────────────────────────────────────────────────────
    public static final String LISTEN_HISTORY_QUEUE   = "listen.history.queue";
    public static final String AI_DATALAKE_QUEUE      = "listen.ai.datalake.queue";
    public static final String FEED_SOCIAL_QUEUE      = "feed.social.queue";

    // ── Dead Letter Exchange & Queues ─────────────────────────────────────────
    private static final String SOCIAL_DLX            = "social.dlx";
    public static final String LISTEN_HISTORY_DLQ     = "listen.history.dlq";
    public static final String AI_DATALAKE_DLQ        = "listen.ai.datalake.dlq";
    public static final String FEED_SOCIAL_DLQ        = "feed.social.dlq";

    // Feed exchange (phải match tên bên music-service)
    private static final String FEED_FANOUT_EXCHANGE  = "feed.content.fanout.exchange";

    // ── Engagement events → recommendation-service ────────────────────────────
    public static final String SOCIAL_ENGAGEMENT_FANOUT_EXCHANGE = "social.engagement.fanout.exchange";

    // ─────────────────────────────────────────────────────────────────────────
    // Infrastructure
    // ─────────────────────────────────────────────────────────────────────────

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

    /**
     * Retry interceptor: thử lại tối đa 3 lần (1s, 2s, 4s) trước khi NACK → DLQ.
     */
    @Bean
    public RetryOperationsInterceptor retryInterceptor() {
        return RetryInterceptorBuilder.stateless()
                .maxAttempts(3)
                .backOffOptions(1000, 2.0, 8000)
                .recoverer(new RejectAndDontRequeueRecoverer())
                .build();
    }

    /**
     * Container factory dùng chung cho tất cả @RabbitListener trong service này.
     * Gắn retry interceptor → message thất bại sau 3 lần sẽ đi vào DLQ.
     */
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter());
        factory.setAdviceChain(retryInterceptor());
        return factory;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dead Letter Exchange (tất cả DLQ đều route vào đây)
    // ─────────────────────────────────────────────────────────────────────────

    @Bean
    public DirectExchange socialDeadLetterExchange() {
        return new DirectExchange(SOCIAL_DLX, true, false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Listen History Queue + DLQ
    // ─────────────────────────────────────────────────────────────────────────

    @Bean
    public FanoutExchange songListenFanoutExchange() {
        return new FanoutExchange(SONG_LISTEN_FANOUT_EXCHANGE, true, false);
    }

    @Bean
    public Queue listenHistoryQueue() {
        return QueueBuilder.durable(LISTEN_HISTORY_QUEUE)
                .withArgument("x-dead-letter-exchange", SOCIAL_DLX)
                .withArgument("x-dead-letter-routing-key", LISTEN_HISTORY_DLQ)
                .build();
    }

    @Bean
    public Queue listenHistoryDlq() {
        return QueueBuilder.durable(LISTEN_HISTORY_DLQ).build();
    }

    @Bean
    public Binding bindListenHistoryDlq(Queue listenHistoryDlq,
                                        DirectExchange socialDeadLetterExchange) {
        return BindingBuilder.bind(listenHistoryDlq).to(socialDeadLetterExchange)
                .with(LISTEN_HISTORY_DLQ);
    }

    @Bean
    public Binding bindListenHistory(Queue listenHistoryQueue,
                                     FanoutExchange songListenFanoutExchange) {
        return BindingBuilder.bind(listenHistoryQueue).to(songListenFanoutExchange);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI Datalake Queue + DLQ
    // ─────────────────────────────────────────────────────────────────────────

    @Bean
    public Queue aiDataLakeQueue() {
        return QueueBuilder.durable(AI_DATALAKE_QUEUE)
                .withArgument("x-dead-letter-exchange", SOCIAL_DLX)
                .withArgument("x-dead-letter-routing-key", AI_DATALAKE_DLQ)
                .build();
    }

    @Bean
    public Queue aiDataLakeDlq() {
        return QueueBuilder.durable(AI_DATALAKE_DLQ).build();
    }

    @Bean
    public Binding bindAiDataLakeDlq(Queue aiDataLakeDlq,
                                     DirectExchange socialDeadLetterExchange) {
        return BindingBuilder.bind(aiDataLakeDlq).to(socialDeadLetterExchange)
                .with(AI_DATALAKE_DLQ);
    }

    @Bean
    public Binding bindAiDataLake(Queue aiDataLakeQueue,
                                  FanoutExchange songListenFanoutExchange) {
        return BindingBuilder.bind(aiDataLakeQueue).to(songListenFanoutExchange);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Feed Social Queue + DLQ
    // ─────────────────────────────────────────────────────────────────────────

    @Bean
    public Queue feedSocialQueue() {
        return QueueBuilder.durable(FEED_SOCIAL_QUEUE)
                .withArgument("x-dead-letter-exchange", SOCIAL_DLX)
                .withArgument("x-dead-letter-routing-key", FEED_SOCIAL_DLQ)
                .build();
    }

    @Bean
    public Queue feedSocialDlq() {
        return QueueBuilder.durable(FEED_SOCIAL_DLQ).build();
    }

    @Bean
    public Binding bindFeedSocialDlq(Queue feedSocialDlq,
                                     DirectExchange socialDeadLetterExchange) {
        return BindingBuilder.bind(feedSocialDlq).to(socialDeadLetterExchange)
                .with(FEED_SOCIAL_DLQ);
    }

    @Bean
    public FanoutExchange feedFanoutExchange() {
        return new FanoutExchange(FEED_FANOUT_EXCHANGE, true, false);
    }

    @Bean
    public Binding bindFeedSocial(Queue feedSocialQueue,
                                  FanoutExchange feedFanoutExchange) {
        return BindingBuilder.bind(feedSocialQueue).to(feedFanoutExchange);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Engagement events
    // ─────────────────────────────────────────────────────────────────────────

    @Bean
    public FanoutExchange socialEngagementFanoutExchange() {
        return new FanoutExchange(SOCIAL_ENGAGEMENT_FANOUT_EXCHANGE, true, false);
    }
}
