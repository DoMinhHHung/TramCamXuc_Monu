package iuh.fit.se.recommendationservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String SONG_PUBLISHED_QUEUE    = "recommendation.song.published";
    public static final String SONG_PUBLISHED_EXCHANGE = "song.events";
    public static final String SONG_PUBLISHED_KEY      = "song.published";

    public static final String ARTIST_FOLLOWED_QUEUE    = "recommendation.artist.followed";
    public static final String ARTIST_FOLLOWED_EXCHANGE = "social.events";
    public static final String ARTIST_FOLLOWED_KEY      = "artist.followed";

    @Bean
    public Queue songPublishedQueue() {
        return QueueBuilder.durable(SONG_PUBLISHED_QUEUE).build();
    }

    @Bean
    public Queue artistFollowedQueue() {
        return QueueBuilder.durable(ARTIST_FOLLOWED_QUEUE).build();
    }

    @Bean
    public TopicExchange songEventsExchange() {
        return new TopicExchange(SONG_PUBLISHED_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange socialEventsExchange() {
        return new TopicExchange(ARTIST_FOLLOWED_EXCHANGE, true, false);
    }

    @Bean
    public Binding songPublishedBinding() {
        return BindingBuilder.bind(songPublishedQueue())
                .to(songEventsExchange())
                .with(SONG_PUBLISHED_KEY);
    }

    @Bean
    public Binding artistFollowedBinding() {
        return BindingBuilder.bind(artistFollowedQueue())
                .to(socialEventsExchange())
                .with(ARTIST_FOLLOWED_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}