package iuh.fit.se.identity.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.core.event.SubscriptionActiveEvent;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.repository.UserRepository;
import iuh.fit.se.identity.service.UserProfileCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionEventListener {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final UserProfileCacheService userProfileCacheService;

    @EventListener
    @Transactional
    public void handleSubscriptionActive(SubscriptionActiveEvent event) {
        log.info("Identity received subscription update for user: {}", event.getUserId());

        userRepository.findById(event.getUserId()).ifPresent(user -> {
            try {
                user.setSubscriptionPlan(event.getPlanName());

                String featuresJson = objectMapper.writeValueAsString(event.getFeatures());
                user.setSubscriptionFeatures(featuresJson);

                userRepository.save(user);
                userProfileCacheService.cacheUserProfile(user);
                log.info("Updated user subscription features in Identity DB and Redis cache");
            } catch (Exception e) {
                log.error("Failed to sync subscription data", e);
            }
        });
    }
}