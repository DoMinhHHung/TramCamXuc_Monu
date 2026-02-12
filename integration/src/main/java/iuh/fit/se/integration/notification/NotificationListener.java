package iuh.fit.se.integration.notification;

import iuh.fit.se.core.event.NotificationEvent;
import iuh.fit.se.integration.email.EmailRequest;
import iuh.fit.se.integration.email.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationListener {

    private final EmailService emailService;
    private final TemplateEngine templateEngine;

    @EventListener
    @Async
    public void handleNotificationEvent(NotificationEvent event) {
        if (!"EMAIL".equals(event.getChannel())) return;

        log.info("Received notification event for: {}", event.getRecipient());

        Context context = new Context();
        context.setVariables(event.getParamMap());
        String htmlContent = templateEngine.process(event.getTemplateCode(), context);

        emailService.sendEmail(EmailRequest.builder()
                .to(event.getRecipient())
                .subject(event.getSubject())
                .content(htmlContent)
                .build());
    }
}
