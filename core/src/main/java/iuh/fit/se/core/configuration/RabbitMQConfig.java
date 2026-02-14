package iuh.fit.se.core.configuration;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String MUSIC_EXCHANGE = "music.exchange";
    public static final String TRANSCODE_QUEUE = "song.transcode.queue";
    public static final String TRANSCODE_ROUTING_KEY = "song.transcode";
    public static final String TRANSCODE_SUCCESS_QUEUE = "song.transcode.success.queue";
    public static final String TRANSCODE_SUCCESS_ROUTING_KEY = "song.transcode.success";

    @Bean
    public DirectExchange musicExchange() {
        return new DirectExchange(MUSIC_EXCHANGE);
    }

    @Bean("transcodeQueue")
    public Queue transcodeQueue() {
        return new Queue(TRANSCODE_QUEUE, true);
    }

    @Bean
    public Binding transcodeBinding(@Qualifier("transcodeQueue") Queue queue, DirectExchange musicExchange) {
        return BindingBuilder.bind(queue).to(musicExchange).with(TRANSCODE_ROUTING_KEY);
    }

    @Bean("transcodeSuccessQueue")
    public Queue transcodeSuccessQueue() {
        return new Queue(TRANSCODE_SUCCESS_QUEUE, true);
    }

    @Bean
    public Binding transcodeSuccessBinding(@Qualifier("transcodeSuccessQueue") Queue queue, DirectExchange musicExchange) {
        return BindingBuilder.bind(queue).to(musicExchange).with(TRANSCODE_SUCCESS_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}