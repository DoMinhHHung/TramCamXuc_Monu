package iuh.fit.se.payment.messaging;

import iuh.fit.se.core.event.UserUpgradedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserUpgradeEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.rabbitmq.user-upgraded.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.user-upgraded.routing-key}")
    private String routingKey;

    public void publishPremiumUpgrade(UUID userId) {
        UserUpgradedEvent event = UserUpgradedEvent.builder()
                .userId(userId)
                .newRole("PREMIUM")
                .build();

        rabbitTemplate.convertAndSend(exchange, routingKey, event);
    }
}
