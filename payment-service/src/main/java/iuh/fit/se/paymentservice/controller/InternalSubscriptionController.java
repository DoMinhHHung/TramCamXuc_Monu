package iuh.fit.se.paymentservice.controller;

import iuh.fit.se.paymentservice.dto.response.InternalSubscriptionStatusResponse;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/internal/subscriptions")
@RequiredArgsConstructor
public class InternalSubscriptionController {

    private final UserSubscriptionRepository userSubscriptionRepository;

    @GetMapping("/{userId}/status")
    public InternalSubscriptionStatusResponse getSubscriptionStatus(@PathVariable UUID userId) {
        LocalDateTime now = LocalDateTime.now();

        UserSubscription active = userSubscriptionRepository
                .findActiveWithPlanByUserId(userId)
                .stream()
                .filter(sub -> sub.getExpiresAt() != null && sub.getExpiresAt().isAfter(now))
                .findFirst()
                .orElse(null);

        if (active == null) {
            return InternalSubscriptionStatusResponse.builder()
                    .userId(userId)
                    .active(false)
                    .features(Map.of())
                    .expiresAt(null)
                    .build();
        }

        return InternalSubscriptionStatusResponse.builder()
                .userId(userId)
                .active(true)
                .features(active.getPlan() != null && active.getPlan().getFeatures() != null
                        ? active.getPlan().getFeatures()
                        : Map.of())
                .expiresAt(active.getExpiresAt())
                .build();
    }
}
