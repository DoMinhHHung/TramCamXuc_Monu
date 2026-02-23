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
}