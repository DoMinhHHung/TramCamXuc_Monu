package iuh.fit.se.social.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocialListenEventMessagingConfig {

    public static final String SOCIAL_ACTIVITY_EXCHANGE = "social.activity.exchange";
    public static final String SONG_LISTEN_ROUTING_KEY = "song.listened";
    public static final String SOCIAL_LISTEN_HISTORY_QUEUE = "social.listen-history.queue";

    @Bean
    public TopicExchange socialActivityExchange(
            @Value("${app.rabbitmq.song-listen.exchange:" + SOCIAL_ACTIVITY_EXCHANGE + "}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue socialListenHistoryQueue(
            @Value("${app.rabbitmq.song-listen.queue:" + SOCIAL_LISTEN_HISTORY_QUEUE + "}") String queueName) {
        return QueueBuilder.durable(queueName).build();
    }

    @Bean
    public Binding socialListenHistoryBinding(Queue socialListenHistoryQueue,
                                              TopicExchange socialActivityExchange,
                                              @Value("${app.rabbitmq.song-listen.routing-key:" + SONG_LISTEN_ROUTING_KEY + "}") String routingKey) {
        return BindingBuilder.bind(socialListenHistoryQueue)
                .to(socialActivityExchange)
                .with(routingKey);
    }
}
