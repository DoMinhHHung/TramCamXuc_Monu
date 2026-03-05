package iuh.fit.se.transcoderservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ── Exchanges ──────────────────────────────────────────────────────────
    public static final String MUSIC_EXCHANGE       = "music.exchange";

    // ── Queues ─────────────────────────────────────────────────────────────
    /** Nhận yêu cầu transcode từ music-service */
    public static final String TRANSCODE_QUEUE          = "transcode.queue";
    /** Dead-letter queue khi transcode thất bại */
    public static final String TRANSCODE_DLQ            = "transcode.dlq";
    /** Trả kết quả transcode thành công về music-service */
    public static final String TRANSCODE_SUCCESS_QUEUE  = "transcode.success.queue";

    // ── Routing Keys ────────────────────────────────────────────────────────
    public static final String TRANSCODE_ROUTING_KEY         = "song.transcode";
    public static final String TRANSCODE_SUCCESS_ROUTING_KEY = "song.transcode.success";
    public static final String TRANSCODE_DLQ_ROUTING_KEY     = "song.transcode.dead";

    // ── Message Converter ────────────────────────────────────────────────────
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

    // ── Exchange ─────────────────────────────────────────────────────────────
    @Bean
    public TopicExchange musicExchange() {
        return new TopicExchange(MUSIC_EXCHANGE, true, false);
    }

    // ── Queues ────────────────────────────────────────────────────────────────
    @Bean
    public Queue transcodeQueue() {
        return QueueBuilder.durable(TRANSCODE_QUEUE)
                .withArgument("x-dead-letter-exchange", MUSIC_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", TRANSCODE_DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue transcodeDlq() {
        return QueueBuilder.durable(TRANSCODE_DLQ).build();
    }

    @Bean
    public Queue transcodeSuccessQueue() {
        return QueueBuilder.durable(TRANSCODE_SUCCESS_QUEUE).build();
    }

    // ── Bindings ──────────────────────────────────────────────────────────────
    @Bean
    public Binding bindTranscodeQueue(Queue transcodeQueue, TopicExchange musicExchange) {
        return BindingBuilder.bind(transcodeQueue)
                .to(musicExchange).with(TRANSCODE_ROUTING_KEY);
    }

    @Bean
    public Binding bindTranscodeDlq(Queue transcodeDlq, TopicExchange musicExchange) {
        return BindingBuilder.bind(transcodeDlq)
                .to(musicExchange).with(TRANSCODE_DLQ_ROUTING_KEY);
    }

    @Bean
    public Binding bindTranscodeSuccessQueue(Queue transcodeSuccessQueue, TopicExchange musicExchange) {
        return BindingBuilder.bind(transcodeSuccessQueue)
                .to(musicExchange).with(TRANSCODE_SUCCESS_ROUTING_KEY);
    }

    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        RabbitAdmin admin = new RabbitAdmin(connectionFactory);
        admin.setAutoStartup(true);
        return admin;
    }
}
