package iuh.fit.se.paymentservice.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.paymentservice.event.FreePlanResponseEvent;
import iuh.fit.se.paymentservice.event.NotificationEvent;
import iuh.fit.se.paymentservice.event.SubscriptionActiveEvent;
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
        Object body = deserialize(event);
        rabbitTemplate.convertAndSend(event.getExchange(), event.getRoutingKey(), body);
        event.setPublished(true);
        outboxEventRepository.save(event);
        log.debug("Outbox published id={} eventType={}", event.getId(), event.getEventType());
    }

    private Object deserialize(OutboxEvent event) throws Exception {
        return switch (event.getEventType()) {
            case OutboxEventTypes.SUBSCRIPTION_ACTIVATED ->
                    objectMapper.readValue(event.getPayload(), SubscriptionActiveEvent.class);
            case OutboxEventTypes.PAYMENT_SUCCESS_EMAIL ->
                    objectMapper.readValue(event.getPayload(), NotificationEvent.class);
            case OutboxEventTypes.FREE_PLAN_BROADCAST ->
                    objectMapper.readValue(event.getPayload(), FreePlanResponseEvent.class);
            default -> throw new IllegalStateException("Unknown outbox eventType: " + event.getEventType());
        };
    }
}
