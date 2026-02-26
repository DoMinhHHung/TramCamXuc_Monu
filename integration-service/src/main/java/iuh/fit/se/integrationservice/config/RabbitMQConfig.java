package iuh.fit.se.integrationservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String NOTIFICATION_EXCHANGE     = "notification.exchange";
    public static final String NOTIFICATION_EMAIL_QUEUE  = "notification.email.queue";
    public static final String NOTIFICATION_EMAIL_ROUTING = "notification.email";

    public static final String NOTIFICATION_DLX          = "notification.dlx";
    public static final String NOTIFICATION_EMAIL_DLQ    = "notification.email.dlq";

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE);
    }

    @Bean
    public DirectExchange notificationDlx() {
        return new DirectExchange(NOTIFICATION_DLX);
    }

    @Bean
    public Queue notificationEmailQueue() {
        return QueueBuilder.durable(NOTIFICATION_EMAIL_QUEUE)
                .withArgument("x-dead-letter-exchange", NOTIFICATION_DLX)
                .withArgument("x-dead-letter-routing-key", NOTIFICATION_EMAIL_DLQ)
                .build();
    }

    @Bean
    public Queue notificationEmailDlq() {
        return QueueBuilder.durable(NOTIFICATION_EMAIL_DLQ).build();
    }

    @Bean
    public Binding bindEmailQueue(Queue notificationEmailQueue,
                                  TopicExchange notificationExchange) {
        return BindingBuilder.bind(notificationEmailQueue)
                .to(notificationExchange)
                .with(NOTIFICATION_EMAIL_ROUTING);
    }

    @Bean
    public Binding bindEmailDlq(Queue notificationEmailDlq,
                                DirectExchange notificationDlx) {
        return BindingBuilder.bind(notificationEmailDlq)
                .to(notificationDlx)
                .with(NOTIFICATION_EMAIL_DLQ);
    }
}