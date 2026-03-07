package iuh.fit.se.identityservice.service.impl;

import iuh.fit.se.identityservice.config.RabbitMQConfig;
import iuh.fit.se.identityservice.event.SubscriptionActiveEvent;
import iuh.fit.se.identityservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionEventListener {

    private final UserRepository userRepository;

    /**
     * Lắng nghe event từ payment-service khi user thanh toán thành công.
     *
     * ⚠️ KHÔNG tự động upgrade role USER → ARTIST ở đây.
     *
     * Luồng đúng:
     *   1. User mua gói → payment-service kích hoạt subscription
     *      → cache features (can_become_artist=true) vào Redis
     *      → publish SubscriptionActiveEvent (handled ở đây — chỉ log)
     *
     *   2. User gọi POST /api/v1/artists/register
     *      → music-service kiểm tra claim "can_become_artist" trong JWT
     *      → tạo Artist profile
     *      → gọi identity-service /internal/users/{id}/grant-artist-role
     *      → identity-service set role = ARTIST + cấp JWT mới có ROLE_ARTIST
     *
     * Role ARTIST chỉ được cấp khi user chủ động đăng ký, không phải tự động.
     */
    @RabbitListener(queues = RabbitMQConfig.IDENTITY_SUBSCRIPTION_QUEUE)
    public void handleSubscriptionActive(SubscriptionActiveEvent event) {
        if (event.getUserId() == null) {
            log.warn("[SubscriptionEvent] userId is null, skipping");
            return;
        }

        log.info("[SubscriptionEvent] Subscription activated for userId={}, plan={}, features={}",
                event.getUserId(), event.getPlanName(), event.getFeatures());

        userRepository.findById(event.getUserId()).ifPresentOrElse(
                user -> log.info("[SubscriptionEvent] Confirmed user exists: userId={}, currentRole={}",
                        user.getId(), user.getRole()),
                () -> log.warn("[SubscriptionEvent] User not found: userId={}", event.getUserId())
        );
    }
}
