package iuh.fit.se.transcoderservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.transcoderservice.config.RabbitMQConfig;
import iuh.fit.se.transcoderservice.dto.TranscodeSongMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * RabbitMQ listener only validates/accepts message and offloads heavy transcode job
 * to async worker pool to avoid blocking consumer threads.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TranscodeListener {

    private final TranscodeWorkerService transcodeWorkerService;

    @RabbitListener(queues = RabbitMQConfig.TRANSCODE_QUEUE)
    public void handleTranscodeRequest(
            TranscodeSongMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        try {
            transcodeWorkerService.process(message);
            channel.basicAck(deliveryTag, false);
            log.info("Accepted transcode job song={} and offloaded to async worker", message.getSongId());
        } catch (Exception e) {
            log.error("Failed to accept transcode job song={}", message.getSongId(), e);
            nack(channel, deliveryTag, message.getSongId() != null ? message.getSongId().toString() : "unknown");
        }
    }

    private void nack(Channel channel, long deliveryTag, String songId) {
        try {
            channel.basicNack(deliveryTag, false, false);
            log.warn("Message for song {} sent to DLQ", songId);
        } catch (IOException ex) {
            log.error("Failed to NACK message for song {}", songId, ex);
        }
    }
}
