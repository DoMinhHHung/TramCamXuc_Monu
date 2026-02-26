package iuh.fit.se.airecommendation.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiRecommendationMessagingConfig {

    @Bean
    TopicExchange socialActivityExchange(@Value("${app.rabbitmq.song-listen.exchange:social.activity.exchange}") String exchange) {
        return new TopicExchange(exchange, true, false);
    }

    @Bean
    Queue aiSongListenQueue(@Value("${app.rabbitmq.song-listen.queue:ai.recommendation.song-listen.queue}") String queueName) {
        return QueueBuilder.durable(queueName).build();
    }

    @Bean
    Binding aiSongListenBinding(Queue aiSongListenQueue,
                                TopicExchange socialActivityExchange,
                                @Value("${app.rabbitmq.song-listen.routing-key:song.listened}") String routingKey) {
        return BindingBuilder.bind(aiSongListenQueue).to(socialActivityExchange).with(routingKey);
    }
}
