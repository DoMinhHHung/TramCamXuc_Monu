package iuh.fit.se.integration.notification;

import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.SubscriptionProvisionedEvent;
import iuh.fit.se.integration.dto.EmailRequest;
import iuh.fit.se.integration.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionProvisionedListener {

    private final EmailService emailService;

    @RabbitListener(queues = RabbitMQConfig.SUBSCRIPTION_PROVISIONED_QUEUE)
    public void handleProvisioned(SubscriptionProvisionedEvent event) {
        if (event.getRecipientEmail() == null || event.getRecipientEmail().isBlank()) {
            log.warn("Missing recipient email for subscription event {}", event.getTransactionId());
            return;
        }

        String subject = event.isSuccess()
                ? "Subscription upgraded successfully"
                : "Subscription upgrade processing issue";

        String content = event.isSuccess()
                ? "<p>Your subscription is now <b>" + event.getPlanName() + "</b>.</p>"
                : "<p>We could not finalize your subscription upgrade. Reason: " + event.getReason() + "</p>";

        emailService.sendEmail(EmailRequest.builder()
                .to(event.getRecipientEmail())
                .subject(subject)
                .content(content)
                .build());
    }
}
