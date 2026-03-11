package iuh.fit.se.adsservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    /** Exchange mà music-service publish song-listen events (fanout) */
    public static final String SONG_LISTEN_FANOUT_EXCHANGE = "song.listen.fanout.exchange";

    /** Queue riêng của ads-service để nhận song-listen events */
    public static final String ADS_LISTEN_QUEUE = "ads.listen.queue";

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

    /** Bind vào fanout exchange của social-service (đã tồn tại) */
    @Bean
    public FanoutExchange songListenFanoutExchange() {
        return new FanoutExchange(SONG_LISTEN_FANOUT_EXCHANGE, true, false);
    }

    @Bean
    public Queue adsListenQueue() {
        return QueueBuilder.durable(ADS_LISTEN_QUEUE).build();
    }

    @Bean
    public Binding bindAdsListenQueue(Queue adsListenQueue,
                                      FanoutExchange songListenFanoutExchange) {
        return BindingBuilder.bind(adsListenQueue).to(songListenFanoutExchange);
    }
}
