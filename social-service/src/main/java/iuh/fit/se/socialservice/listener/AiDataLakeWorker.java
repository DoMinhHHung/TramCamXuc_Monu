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
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiDataLakeWorker {

    private static final int FLUSH_SIZE = 500;

    private final AiDataLakeWriter aiDataLakeWriter;
    private final ObjectMapper objectMapper;

    private final ConcurrentLinkedQueue<SongListenEvent> buffer = new ConcurrentLinkedQueue<>();

    @RabbitListener(queues = RabbitMQConfig.AI_DATALAKE_QUEUE)
    public void consume(SongListenEvent event) {
        buffer.offer(event);
        if (buffer.size() >= FLUSH_SIZE) {
            flush();
        }
    }

    @Scheduled(fixedDelay = 60_000)
    public void scheduledFlush() {
        flush();
    }

    private synchronized void flush() {
        if (buffer.isEmpty()) {
            return;
        }

        List<SongListenEvent> batch = new ArrayList<>(FLUSH_SIZE);
        while (batch.size() < FLUSH_SIZE) {
            SongListenEvent event = buffer.poll();
            if (event == null) {
                break;
            }
            batch.add(event);
        }

        if (batch.isEmpty()) {
            return;
        }

        try {
            StringBuilder jsonl = new StringBuilder();
            for (SongListenEvent event : batch) {
                jsonl.append(objectMapper.writeValueAsString(event)).append('\n');
            }

            String objectKey = buildObjectKey();
            aiDataLakeWriter.uploadJsonl(objectKey, jsonl.toString());
        } catch (Exception e) {
            log.error("Failed to flush AI data-lake batch, restoring {} events", batch.size(), e);
            batch.forEach(buffer::offer);
        }
    }

    private String buildObjectKey() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = now.format(DateTimeFormatter.ofPattern("yyyy/MM/dd/HH/mm"));
        return "listen-events/" + prefix + "/batch-" + System.currentTimeMillis() + "-" + UUID.randomUUID() + ".jsonl";
    }
}
