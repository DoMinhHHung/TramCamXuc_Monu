package iuh.fit.se.paymentservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ── Exchanges ──────────────────────────────────────────────────────────
    public static final String IDENTITY_EXCHANGE     = "identity.exchange";

    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";

    public static final String CONFIG_EXCHANGE       = "config.exchange";

    // ── Routing keys ───────────────────────────────────────────────────────
    /** identity-service lắng nghe key này để cập nhật subscription của user */
    public static final String ROUTING_SUBSCRIPTION_ACTIVE = "subscription.active";

    /** identity-service lắng nghe key này để nhận config FREE plan */
    public static final String ROUTING_FREE_PLAN_RESPONSE  = "config.free-plan";

    /** integration-service lắng nghe key này để gửi email */
    public static final String ROUTING_NOTIFICATION_EMAIL  = "notification.email";

    // ── Message Converter ──────────────────────────────────────────────────
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

    // ── Exchanges (khai báo để RabbitMQ tự tạo nếu chưa có) ──────────────
    @Bean
    public TopicExchange identityExchange() {
        return new TopicExchange(IDENTITY_EXCHANGE);
    }

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE);
    }

    @Bean
    public TopicExchange configExchange() {
        return new TopicExchange(CONFIG_EXCHANGE);
    }
}
