package iuh.fit.se.integrationservice.service;

import iuh.fit.se.integrationservice.config.RabbitMQConfig;
import iuh.fit.se.integrationservice.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationListener {

    private final EmailService emailService;

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_EMAIL_QUEUE)
    public void handleNotification(NotificationEvent event) {
        log.info("Received notification event: channel={}, recipient={}, template={}",
                event.getChannel(), event.getRecipient(), event.getTemplateCode());

        if (event.getRecipient() == null || event.getRecipient().isBlank()) {
            log.warn("Notification event has no recipient, skipping");
            return;
        }

        switch (event.getChannel()) {
            case "EMAIL" -> emailService.sendEmail(
                    event.getRecipient(),
                    event.getSubject(),
                    event.getTemplateCode(),
                    event.getParamMap()
            );
            default -> log.warn("Unsupported notification channel: {}", event.getChannel());
        }
    }
}