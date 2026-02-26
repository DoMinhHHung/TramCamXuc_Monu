package iuh.fit.se.integrationservice.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Async
    public void sendEmail(String to, String subject, String templateCode,
                          Map<String, Object> params) {
        try {
            Context ctx = new Context();
            if (params != null) ctx.setVariables(params);

            String htmlContent = templateEngine.process(
                    "email/" + templateCode, ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Email sent to {} with template {}", to, templateCode);

        } catch (MessagingException e) {
            log.error("Failed to send email to {} with template {}: {}",
                    to, templateCode, e.getMessage());
            throw new RuntimeException("Email sending failed", e);
        }
    }
}