package iuh.fit.se.identity.messaging;

import iuh.fit.se.core.event.UserUpgradedEvent;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.Role;
import iuh.fit.se.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserUpgradedEventListener {

    private final UserRepository userRepository;

    @RabbitListener(queues = "${app.rabbitmq.user-upgraded.queue:identity.user-upgraded.queue}")
    @Transactional
    public void handleUserUpgraded(UserUpgradedEvent event) {
        log.info("Received UserUpgradedEvent for userId={} with role={}", event.getUserId(), event.getNewRole());

        User user = userRepository.findById(event.getUserId())
                .orElseThrow(() -> new IllegalStateException("User not found: " + event.getUserId()));

        Role targetRole = Role.PREMIUM;
        if (event.getNewRole() != null) {
            try {
                targetRole = Role.valueOf(event.getNewRole().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                targetRole = Role.PREMIUM;
            }
        }

        user.setRole(targetRole);
        userRepository.save(user);
    }
}
