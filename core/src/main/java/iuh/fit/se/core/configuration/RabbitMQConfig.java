package iuh.fit.se.core.configuration;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String MUSIC_EXCHANGE = "music.exchange";
    public static final String DEAD_LETTER_EXCHANGE = "music.dlx";

    public static final String TRANSCODE_QUEUE = "song.transcode.queue";
    public static final String TRANSCODE_ROUTING_KEY = "song.transcode";
    public static final String TRANSCODE_DLQ = "song.transcode.dlq";

    public static final String TRANSCODE_SUCCESS_QUEUE = "song.transcode.success.queue";
    public static final String TRANSCODE_SUCCESS_ROUTING_KEY = "song.transcode.success";

    public static final String MUSIC_EVENT_EXCHANGE = "music.event.exchange";

    public static final String LISTEN_HISTORY_QUEUE    = "listen.history.queue";
    public static final String LISTEN_TRENDING_QUEUE   = "listen.trending.queue";
    public static final String SONG_LISTEN_ROUTING_KEY = "song.listened";

    public static final String LISTEN_DLX = "listen.dlx";
    public static final String LISTEN_HISTORY_DLQ = "listen.history.dlq";
    public static final String LISTEN_TRENDING_DLQ = "listen.trending.dlq";

    public static final String BILLING_EXCHANGE = "billing.event.exchange";
    public static final String SUBSCRIPTION_UPGRADE_REQUESTED_QUEUE = "subscription.upgrade.requested.queue";
    public static final String SUBSCRIPTION_UPGRADE_REQUESTED_ROUTING_KEY = "subscription.upgrade.requested";
    public static final String SUBSCRIPTION_PROVISIONED_QUEUE = "subscription.provisioned.queue";
    public static final String SUBSCRIPTION_PROVISIONED_ROUTING_KEY = "subscription.provisioned";

    @Bean("musicExchange")
    public DirectExchange musicExchange() {
        return new DirectExchange(MUSIC_EXCHANGE);
    }

    @Bean("deadLetterExchange")
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE);
    }

    @Bean("transcodeQueue")
    public Queue transcodeQueue() {
        return QueueBuilder.durable(TRANSCODE_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", TRANSCODE_DLQ)
                .build();
    }

    @Bean
    public Binding transcodeBinding(@Qualifier("transcodeQueue") Queue queue,
                                    @Qualifier("musicExchange") DirectExchange musicExchange) {
        return BindingBuilder.bind(queue).to(musicExchange).with(TRANSCODE_ROUTING_KEY);
    }

    @Bean("transcodeDlq")
    public Queue transcodeDlq() {
        return QueueBuilder.durable(TRANSCODE_DLQ).build();
    }

    @Bean
    public Binding transcodeDlqBinding(@Qualifier("transcodeDlq") Queue queue,
                                       @Qualifier("deadLetterExchange") DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(queue).to(deadLetterExchange).with(TRANSCODE_DLQ);
    }

    @Bean("transcodeSuccessQueue")
    public Queue transcodeSuccessQueue() {
        return new Queue(TRANSCODE_SUCCESS_QUEUE, true);
    }

    @Bean
    public Binding transcodeSuccessBinding(@Qualifier("transcodeSuccessQueue") Queue queue,
                                           @Qualifier("musicExchange") DirectExchange musicExchange) {
        return BindingBuilder.bind(queue).to(musicExchange).with(TRANSCODE_SUCCESS_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public TopicExchange musicEventExchange() {
        return new TopicExchange(MUSIC_EVENT_EXCHANGE);
    }

    @Bean
    public Queue listenHistoryQueue() {
        return QueueBuilder.durable(LISTEN_HISTORY_QUEUE)
                .withArgument("x-dead-letter-exchange", LISTEN_DLX)
                .withArgument("x-dead-letter-routing-key", LISTEN_HISTORY_DLQ)
                .build();
    }

    @Bean
    public Queue listenTrendingQueue() {
        return QueueBuilder.durable(LISTEN_TRENDING_QUEUE)
                .withArgument("x-dead-letter-exchange", LISTEN_DLX)
                .withArgument("x-dead-letter-routing-key", LISTEN_TRENDING_DLQ)
                .build();
    }

    @Bean
    public Binding bindHistoryQueue(@Qualifier("listenHistoryQueue") Queue listenHistoryQueue,
                                    @Qualifier("musicEventExchange") TopicExchange musicEventExchange) {
        return BindingBuilder.bind(listenHistoryQueue)
                .to(musicEventExchange).with(SONG_LISTEN_ROUTING_KEY);
    }

    @Bean
    public Binding bindTrendingQueue(@Qualifier("listenTrendingQueue") Queue listenTrendingQueue,
                                     @Qualifier("musicEventExchange") TopicExchange musicEventExchange) {
        return BindingBuilder.bind(listenTrendingQueue)
                .to(musicEventExchange).with(SONG_LISTEN_ROUTING_KEY);
    }

    @Bean
    public TopicExchange billingEventExchange() {
        return new TopicExchange(BILLING_EXCHANGE);
    }

    @Bean
    public Queue subscriptionUpgradeRequestedQueue() {
        return QueueBuilder.durable(SUBSCRIPTION_UPGRADE_REQUESTED_QUEUE).build();
    }

    @Bean
    public Binding bindSubscriptionUpgradeRequestedQueue(@Qualifier("subscriptionUpgradeRequestedQueue") Queue subscriptionUpgradeRequestedQueue,
                                                         @Qualifier("billingEventExchange") TopicExchange billingEventExchange) {
        return BindingBuilder.bind(subscriptionUpgradeRequestedQueue)
                .to(billingEventExchange)
                .with(SUBSCRIPTION_UPGRADE_REQUESTED_ROUTING_KEY);
    }

    @Bean
    public Queue subscriptionProvisionedQueue() {
        return QueueBuilder.durable(SUBSCRIPTION_PROVISIONED_QUEUE).build();
    }

    @Bean
    public Binding bindSubscriptionProvisionedQueue(@Qualifier("subscriptionProvisionedQueue") Queue subscriptionProvisionedQueue,
                                                    @Qualifier("billingEventExchange") TopicExchange billingEventExchange) {
        return BindingBuilder.bind(subscriptionProvisionedQueue)
                .to(billingEventExchange)
                .with(SUBSCRIPTION_PROVISIONED_ROUTING_KEY);
    }

}