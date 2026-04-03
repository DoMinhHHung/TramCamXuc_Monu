package iuh.fit.se.identityservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.identityservice.entity.OutboxEvent;
import iuh.fit.se.identityservice.enums.OutboxEventTypes;
import iuh.fit.se.identityservice.event.NotificationEvent;
import iuh.fit.se.identityservice.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisherService {

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishSingle(OutboxEvent event) throws Exception {
        if (!OutboxEventTypes.NOTIFICATION_EMAIL.equals(event.getEventType())) {
            throw new IllegalStateException("Unknown outbox eventType: " + event.getEventType());
        }
        NotificationEvent body = objectMapper.readValue(event.getPayload(), NotificationEvent.class);
        rabbitTemplate.convertAndSend(event.getExchange(), event.getRoutingKey(), body);
        event.setPublished(true);
        outboxEventRepository.save(event);
        log.debug("Outbox published id={} eventType={}", event.getId(), event.getEventType());
    }
}
