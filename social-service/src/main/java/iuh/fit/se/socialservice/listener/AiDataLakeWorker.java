package iuh.fit.se.socialservice.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.socialservice.config.RabbitMQConfig;
import iuh.fit.se.socialservice.dto.message.SongListenEvent;
import iuh.fit.se.socialservice.service.impl.AiDataLakeWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicLong;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiDataLakeWorker {

    private static final int FLUSH_SIZE = 500;
    private static final int MAX_BUFFER_SIZE = 5_000;

    private final AiDataLakeWriter aiDataLakeWriter;
    private final ObjectMapper objectMapper;

    private final BlockingQueue<SongListenEvent> buffer = new LinkedBlockingQueue<>(MAX_BUFFER_SIZE);
    private final AtomicLong droppedCount = new AtomicLong(0);

    @RabbitListener(queues = RabbitMQConfig.AI_DATALAKE_QUEUE)
    public void consume(SongListenEvent event) {
        boolean accepted = buffer.offer(event);
        if (!accepted) {
            long dropped = droppedCount.incrementAndGet();
            if (dropped % 1000 == 0) {
                log.warn("[AI DataLake] Buffer full! Total dropped: {}", dropped);
            }
            return;
        }
        if (buffer.size() >= FLUSH_SIZE) {
            flush();
        }
    }

    @Scheduled(fixedDelay = 60_000)
    public void scheduledFlush() {
        flush();
        long dropped = droppedCount.getAndSet(0);
        if (dropped > 0) {
            log.warn("[AI DataLake] Dropped {} events in last flush cycle", dropped);
        }
    }

    private synchronized void flush() {
        if (buffer.isEmpty()) {
            return;
        }

        List<SongListenEvent> batch = new ArrayList<>(FLUSH_SIZE);
        int drained = buffer.drainTo(batch, FLUSH_SIZE);
        if (drained == 0) {
            return;
        }

        int retryCount = 0;
        int maxRetries = 3;
        while (retryCount < maxRetries) {
            try {
                StringBuilder jsonl = new StringBuilder();
                for (SongListenEvent event : batch) {
                    jsonl.append(objectMapper.writeValueAsString(event)).append('\n');
                }
                String objectKey = buildObjectKey();
                aiDataLakeWriter.uploadJsonl(objectKey, jsonl.toString());
                log.info("[AI DataLake] Flushed {} events to {}", drained, objectKey);
                return;
            } catch (Exception e) {
                retryCount++;
                if (retryCount < maxRetries) {
                    log.warn("[AI DataLake] Upload failed (attempt {}/{}): {}", retryCount, maxRetries, e.getMessage());
                    try {
                        Thread.sleep(1000L * retryCount);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                } else {
                    log.error("[AI DataLake] Failed to upload batch after {} retries. Dropping {} events. Error: {}",
                            maxRetries, drained, e.getMessage());
                }
            }
        }
    }

    private String buildObjectKey() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = now.format(DateTimeFormatter.ofPattern("yyyy/MM/dd/HH/mm"));
        return "listen-events/" + prefix + "/batch-" + System.currentTimeMillis() + "-" + UUID.randomUUID() + ".jsonl";
    }
}
