package iuh.fit.se.payment.configuration;

import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.payment.entity.SubscriptionPlan;
import iuh.fit.se.payment.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Override
    @Transactional
    public void run(String... args) {
        seedFreePlan();
    }

    private void seedFreePlan() {
        if (!planRepository.existsBySubsName(SubscriptionConstants.PLAN_FREE)) {
            log.info("Seeding FREE subscription plan...");

            Map<String, Object> features = Map.of(
                    SubscriptionConstants.FEATURE_QUALITY, "128kbps",
                    SubscriptionConstants.FEATURE_NO_ADS, false,
                    SubscriptionConstants.FEATURE_OFFLINE, false,
                    SubscriptionConstants.FEATURE_DOWNLOAD, false,
                    SubscriptionConstants.FEATURE_PLAYLIST_LIMIT, 5,
                    SubscriptionConstants.FEATURE_CAN_BECOME_ARTIST, false,
                    SubscriptionConstants.FEATURE_CREATE_ALBUM, false,
                    SubscriptionConstants.FEATURE_RECOMMENDATION, "basic"
            );

            SubscriptionPlan freePlan = SubscriptionPlan.builder()
                    .subsName(SubscriptionConstants.PLAN_FREE)
                    .description("Gói mặc định cho người dùng mới")
                    .price(BigDecimal.ZERO)
                    .durationDays(36500)
                    .isActive(true)
                    .displayOrder(0)
                    .features(features)
                    .build();

            planRepository.save(freePlan);
            log.info("FREE plan created successfully.");
        }
    }
}
