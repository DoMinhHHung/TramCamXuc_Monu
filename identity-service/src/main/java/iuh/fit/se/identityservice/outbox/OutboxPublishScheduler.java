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

    @Scheduled(fixedDelayString = "${outbox.publish-delay-ms:5000}")
    public void publishPending() {
        Boolean acquired = redis.opsForValue()
            .setIfAbsent("lock:outbox:publish", "1", Duration.ofSeconds(4));
        if (!Boolean.TRUE.equals(acquired)) return;
        
        try {
            List<OutboxEvent> batch = outboxEventRepository
                .findTop50ByPublishedFalseOrderByCreatedAtAsc();
            for (OutboxEvent e : batch) {
                try { outboxPublisherService.publishSingle(e); }
                catch (Exception ex) { log.warn("Outbox retry: {}", ex.getMessage()); }
            }
        } finally {
            redis.delete("lock:outbox:publish");
        }
    }
}
