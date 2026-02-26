package iuh.fit.se.paymentservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String IDENTITY_EXCHANGE     = "identity.exchange";
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";
    public static final String CONFIG_EXCHANGE       = "config.exchange";

    public static final String ROUTING_FREE_PLAN_RESPONSE   = "config.free-plan";
    public static final String ROUTING_SUBSCRIPTION_ACTIVE  = "subscription.active";
    public static final String ROUTING_NOTIFICATION_EMAIL   = "notification.email";

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

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