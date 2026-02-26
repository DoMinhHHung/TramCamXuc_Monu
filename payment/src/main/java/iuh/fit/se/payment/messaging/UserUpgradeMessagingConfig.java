package iuh.fit.se.payment.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserUpgradeMessagingConfig {

    @Bean
    public DirectExchange userLifecycleExchange(@Value("${app.rabbitmq.user-upgraded.exchange}") String exchangeName) {
        return new DirectExchange(exchangeName, true, false);
    }

    @Bean
    public Queue userUpgradedQueue(@Value("${app.rabbitmq.user-upgraded.queue}") String queueName) {
        return QueueBuilder.durable(queueName).build();
    }

    @Bean
    public Binding userUpgradedBinding(Queue userUpgradedQueue,
                                       DirectExchange userLifecycleExchange,
                                       @Value("${app.rabbitmq.user-upgraded.routing-key}") String routingKey) {
        return BindingBuilder.bind(userUpgradedQueue)
                .to(userLifecycleExchange)
                .with(routingKey);
    }
}
