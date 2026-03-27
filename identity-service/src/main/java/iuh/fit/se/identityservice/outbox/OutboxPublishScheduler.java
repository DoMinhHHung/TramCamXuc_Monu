package iuh.fit.se.identityservice.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublishScheduler {

    private final OutboxEventRepository outboxEventRepository;
    private final OutboxPublisherService outboxPublisherService;

    @Scheduled(fixedDelayString = "${outbox.publish-delay-ms:1000}")
    public void publishPending() {
        List<OutboxEvent> batch = outboxEventRepository.findTop50ByPublishedFalseOrderByCreatedAtAsc();
        for (OutboxEvent e : batch) {
            try {
                outboxPublisherService.publishSingle(e);
            } catch (Exception ex) {
                log.warn("Outbox publish failed, will retry id={} eventType={}: {}",
                        e.getId(), e.getEventType(), ex.getMessage());
            }
        }
    }
}
