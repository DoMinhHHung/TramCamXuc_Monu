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

/**
 * Consumes transcode requests with {@code AcknowledgeMode.MANUAL}. Ack / nack run inside
 * {@link TranscodeWorkerService} after work finishes, on this consumer thread (Channel is not thread-safe).
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

        transcodeWorkerService.process(message, channel, deliveryTag);
    }
}
