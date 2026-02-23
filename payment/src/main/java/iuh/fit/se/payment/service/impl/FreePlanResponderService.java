package iuh.fit.se.payment.service.impl;

import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.event.FreePlanResponseEvent;
import iuh.fit.se.core.event.RequestFreePlanEvent;
import iuh.fit.se.payment.entity.SubscriptionPlan;
import iuh.fit.se.payment.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FreePlanResponderService {

    private final SubscriptionPlanRepository planRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final Map<String, Object> FALLBACK_FEATURES = Map.of(
            "quality", "128kbps", "playlist_limit", 5, "download", false
    );

    @EventListener
    @Transactional(readOnly = true)
    public void handleRequest(RequestFreePlanEvent event) {

        SubscriptionPlan freePlan = planRepository.findBySubsNameAndIsActiveTrue(SubscriptionConstants.PLAN_FREE)
                .orElse(null);

        String planName = SubscriptionConstants.PLAN_FREE;
        Map<String, Object> features = FALLBACK_FEATURES;

        if (freePlan != null) {
            features = freePlan.getFeatures();
            planName = freePlan.getSubsName();
        } else {
            log.warn("FREE plan not found in DB! Using fallback.");
        }

        eventPublisher.publishEvent(FreePlanResponseEvent.builder()
                .planName(planName)
                .features(features)
                .build());
    }
}