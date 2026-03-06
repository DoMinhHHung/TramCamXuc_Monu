package iuh.fit.se.socialservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String MUSIC_EVENT_EXCHANGE   = "music.event.exchange";

    public static final String LISTEN_HISTORY_QUEUE   = "listen.history.queue";

    public static final String SONG_LISTEN_ROUTING_KEY = "song.listened";

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

    @Bean
    public TopicExchange musicEventExchange() {
        return new TopicExchange(MUSIC_EVENT_EXCHANGE, true, false);
    }

    @Bean
    public Queue listenHistoryQueue() {
        return QueueBuilder.durable(LISTEN_HISTORY_QUEUE).build();
    }

    @Bean
    public Binding bindListenHistory(Queue listenHistoryQueue,
                                     TopicExchange musicEventExchange) {
        return BindingBuilder.bind(listenHistoryQueue)
                .to(musicEventExchange)
                .with(SONG_LISTEN_ROUTING_KEY);
    }
}
