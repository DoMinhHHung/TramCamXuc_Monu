package iuh.fit.se.paymentservice.config;

import iuh.fit.se.paymentservice.entity.SubscriptionPlan;
import iuh.fit.se.paymentservice.event.FreePlanResponseEvent;
import iuh.fit.se.paymentservice.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentDataSeeder implements CommandLineRunner {

    private final SubscriptionPlanRepository planRepository;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        seedFreePlan();
    }

    private void seedFreePlan() {
        if (planRepository.existsBySubsName("FREE")) {
            broadcastFreePlan();
            return;
        }

        log.info("Seeding FREE subscription plan...");

        Map<String, Object> features = Map.of(
                "quality",            "128kbps",
                "no_ads",             false,
                "offline",            false,
                "download",           false,
                "playlist_limit",     5,
                "can_become_artist",  false,
                "create_album",       false,
                "recommendation",     "basic"
        );

        SubscriptionPlan freePlan = planRepository.save(SubscriptionPlan.builder()
                .subsName("FREE")
                .description("Gói mặc định cho người dùng mới")
                .price(BigDecimal.ZERO)
                .durationDays(36500)   // ~100 năm
                .isActive(true)
                .displayOrder(0)
                .features(features)
                .build());

        log.info("FREE plan created: id={}", freePlan.getId());
        broadcastFreePlan(freePlan);
    }

    /**
     * Broadcast FREE plan config sang identity-service qua RabbitMQ.
     * Được gọi cả lúc mới seed lẫn lúc restart (đảm bảo identity-service luôn có config đúng).
     */
    private void broadcastFreePlan() {
        planRepository.findBySubsNameAndIsActiveTrue("FREE")
                .ifPresent(this::broadcastFreePlan);
    }

    private void broadcastFreePlan(SubscriptionPlan plan) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.CONFIG_EXCHANGE,
                    RabbitMQConfig.ROUTING_FREE_PLAN_RESPONSE,
                    FreePlanResponseEvent.builder()
                            .planName(plan.getSubsName())
                            .features(plan.getFeatures())
                            .build()
            );
            log.info("Broadcasted FREE plan config to identity-service");
        } catch (Exception e) {
            log.error("Failed to broadcast FREE plan config — identity-service may have stale FREE plan", e);
        }
    }
}
