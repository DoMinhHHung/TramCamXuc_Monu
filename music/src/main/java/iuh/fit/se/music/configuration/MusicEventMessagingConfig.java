package iuh.fit.se.music.configuration;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MusicEventMessagingConfig {

    public static final String SONG_LISTEN_EXCHANGE = "social.activity.exchange";
    public static final String SONG_LISTEN_ROUTING_KEY = "song.listened";

    @Bean
    public TopicExchange socialActivityExchange(
            @Value("${app.rabbitmq.song-listen.exchange:" + SONG_LISTEN_EXCHANGE + "}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue songListenQueue(
            @Value("${app.rabbitmq.song-listen.queue:listen.trending.queue}") String queueName) {
        return QueueBuilder.durable(queueName).build();
    }

    @Bean
    public Binding songListenBinding(Queue songListenQueue,
                                     TopicExchange socialActivityExchange,
                                     @Value("${app.rabbitmq.song-listen.routing-key:" + SONG_LISTEN_ROUTING_KEY + "}") String routingKey) {
        return BindingBuilder.bind(songListenQueue)
                .to(socialActivityExchange)
                .with(routingKey);
    }
}
