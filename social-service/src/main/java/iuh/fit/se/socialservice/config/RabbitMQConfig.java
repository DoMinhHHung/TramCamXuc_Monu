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

    public static final String SONG_LISTEN_FANOUT_EXCHANGE = "song.listen.fanout.exchange";

    public static final String LISTEN_HISTORY_QUEUE = "listen.history.queue";
    public static final String AI_DATALAKE_QUEUE = "listen.ai.datalake.queue";

    public static final String FEED_SOCIAL_QUEUE = "feed.social.queue";

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
    public FanoutExchange songListenFanoutExchange() {
        return new FanoutExchange(SONG_LISTEN_FANOUT_EXCHANGE, true, false);
    }

    @Bean
    public Queue listenHistoryQueue() {
        return QueueBuilder.durable(LISTEN_HISTORY_QUEUE).build();
    }

    @Bean
    public Queue aiDataLakeQueue() {
        return QueueBuilder.durable(AI_DATALAKE_QUEUE).build();
    }

    @Bean
    public Binding bindListenHistory(Queue listenHistoryQueue,
                                     FanoutExchange songListenFanoutExchange) {
        return BindingBuilder.bind(listenHistoryQueue).to(songListenFanoutExchange);
    }

    @Bean
    public Binding bindAiDataLake(Queue aiDataLakeQueue,
                                  FanoutExchange songListenFanoutExchange) {
        return BindingBuilder.bind(aiDataLakeQueue).to(songListenFanoutExchange);
    }

    // Exchange phải match tên bên music-service
    private static final String FEED_FANOUT_EXCHANGE = "feed.content.fanout.exchange";

    @Bean
    public Queue feedSocialQueue() {
        return QueueBuilder.durable(FEED_SOCIAL_QUEUE).build();
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
}
