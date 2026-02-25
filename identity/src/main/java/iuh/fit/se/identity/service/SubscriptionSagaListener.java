package iuh.fit.se.identity.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.SubscriptionProvisionedEvent;
import iuh.fit.se.core.dto.message.SubscriptionUpgradeRequestedEvent;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionSagaListener {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final UserProfileCacheService userProfileCacheService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConfig.SUBSCRIPTION_UPGRADE_REQUESTED_QUEUE)
    @Transactional
    public void handleSubscriptionUpgradeRequested(SubscriptionUpgradeRequestedEvent event) {
        boolean success = false;
        String reason = null;
        String recipientEmail = null;

        try {
            User user = userRepository.findById(event.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found for subscription provisioning"));

            user.setSubscriptionPlan(event.getPlanName());
            user.setSubscriptionFeatures(objectMapper.writeValueAsString(event.getFeatures()));
            userRepository.save(user);
            userProfileCacheService.cacheUserProfile(user);
            recipientEmail = user.getEmail();

            success = true;
            log.info("Provisioned subscription {} for user {}", event.getPlanName(), event.getUserId());
        } catch (Exception ex) {
            reason = ex.getMessage();
            log.error("Failed to provision subscription for user {}", event.getUserId(), ex);
        }

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.BILLING_EXCHANGE,
                RabbitMQConfig.SUBSCRIPTION_PROVISIONED_ROUTING_KEY,
                SubscriptionProvisionedEvent.builder()
                        .userId(event.getUserId())
                        .subscriptionId(event.getSubscriptionId())
                        .transactionId(event.getTransactionId())
                        .planName(event.getPlanName())
                        .recipientEmail(recipientEmail)
                        .success(success)
                        .reason(reason)
                        .build()
        );
    }
}
