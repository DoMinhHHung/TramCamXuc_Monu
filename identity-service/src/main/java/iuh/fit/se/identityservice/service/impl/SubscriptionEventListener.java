package iuh.fit.se.identityservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.identityservice.config.RabbitMQConfig;
import iuh.fit.se.identityservice.event.SubscriptionActiveEvent;
import iuh.fit.se.identityservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionEventListener {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = RabbitMQConfig.IDENTITY_SUBSCRIPTION_QUEUE)
    @Transactional
    public void handleSubscriptionActive(SubscriptionActiveEvent event) {
        log.info("Received subscription update for user: {}", event.getUserId());

        userRepository.findById(event.getUserId()).ifPresent(user -> {
            try {
                user.setSubscriptionPlan(event.getPlanName());
                user.setSubscriptionFeatures(objectMapper.writeValueAsString(event.getFeatures()));
                userRepository.save(user);
                log.info("Updated subscription for user: {}", event.getUserId());
            } catch (Exception e) {
                log.error("Failed to sync subscription for user: {}", event.getUserId(), e);
            }
        });
    }
}