package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import feign.FeignException;
import iuh.fit.se.musicservice.client.PaymentAiMusicInternalClient;
import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.internal.AiMusicJobRedisState;
import iuh.fit.se.musicservice.dto.internal.payment.InternalAiMusicConsumeRequest;
import iuh.fit.se.musicservice.dto.messaging.AiMusicGenerateMessage;
import iuh.fit.se.musicservice.service.AiMusicCompositionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiMusicGenerateListener {

    private static final String REDIS_PREFIX = "ai:music:job:";
    private static final Duration JOB_TTL = Duration.ofMinutes(30);

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final AiMusicCompositionService aiMusicCompositionService;
    private final MinioStorageService minioStorageService;
    private final PaymentAiMusicInternalClient paymentAiMusicInternalClient;

    @RabbitListener(queues = RabbitMQConfig.AI_MUSIC_GENERATE_QUEUE, ackMode = "MANUAL")
    public void onMessage(
            AiMusicGenerateMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        var jobId = message.getJobId();
        log.info("[AiMusicWorker] start jobId={}", jobId);

        try {
            String key = REDIS_PREFIX + jobId;
            String raw = stringRedisTemplate.opsForValue().get(key);
            if (raw == null) {
                log.warn("[AiMusicWorker] redis missing for jobId={} — ack", jobId);
                channel.basicAck(deliveryTag, false);
                return;
            }

            AiMusicJobRedisState state = objectMapper.readValue(raw, AiMusicJobRedisState.class);
            state.setStatus("PROCESSING");
            state.setErrorMessage(null);
            persistState(key, state);

            byte[] audio = aiMusicCompositionService.composeMusic(message);

            minioStorageService.uploadRawBytes(state.getPreviewRawKey(), audio, "audio/mpeg");

            try {
                paymentAiMusicInternalClient.consume(InternalAiMusicConsumeRequest.builder()
                        .userId(message.getUserId())
                        .periodYm(message.getPeriodYm())
                        .durationSeconds(message.getDurationSeconds())
                        .build());
            } catch (FeignException e) {
                int st = e.status();
                log.error("[AiMusicWorker] payment consume failed status={} jobId={}", st, jobId);
                minioStorageService.deleteRawObject(state.getPreviewRawKey());
                state.setStatus("FAILED");
                state.setErrorMessage(st == 409 ? "Quota exceeded while finalizing" : "Could not record usage");
                persistState(key, state);
                channel.basicAck(deliveryTag, false);
                return;
            }

            state.setStatus("READY");
            state.setErrorMessage(null);
            persistState(key, state);
            log.info("[AiMusicWorker] done jobId={}", jobId);
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("[AiMusicWorker] failed jobId={}", jobId, e);
            try {
                String key = REDIS_PREFIX + jobId;
                String raw = stringRedisTemplate.opsForValue().get(key);
                if (raw != null) {
                    AiMusicJobRedisState state = objectMapper.readValue(raw, AiMusicJobRedisState.class);
                    state.setStatus("FAILED");
                    state.setErrorMessage(
                            e.getMessage() != null ? e.getMessage().substring(0, Math.min(500, e.getMessage().length()))
                                    : "Generation failed");
                    persistState(key, state);
                }
            } catch (Exception ignored) {
            }
            channel.basicAck(deliveryTag, false);
        }
    }

    private void persistState(String key, AiMusicJobRedisState state) throws Exception {
        stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(state), JOB_TTL);
    }

}
