package iuh.fit.se.transcoder.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.TranscodeSongMessage;
import iuh.fit.se.core.dto.message.TranscodeSuccessMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscodeListener {

    @Value("${transcoder.generate-mp3-download:false}")
    private boolean generateMp3Download;

    private final MinioHelper minioHelper;
    private final FfmpegService ffmpegService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConfig.TRANSCODE_QUEUE)
    public void handleTranscodeRequest(
            TranscodeSongMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        log.info("==== START TRANSCODING FOR SONG: {} ====", message.getSongId());

        String tmpDir = System.getProperty("java.io.tmpdir");
        String localRawFilePath = Paths.get(tmpDir, message.getSongId() + "." + message.getFileExtension()).toString();
        String outputDir = Paths.get(tmpDir, "output_" + message.getSongId()).toString();
        String localMp3FilePath = Paths.get(tmpDir, message.getSongId() + "-320kbps.mp3").toString();

        try {
            new File(outputDir).mkdirs();

            minioHelper.downloadRawFile(message.getRawFileKey(), localRawFilePath);

            int duration = ffmpegService.getDuration(localRawFilePath);
            log.info("Duration calculated: {} seconds", duration);

            ffmpegService.generateHls(localRawFilePath, outputDir);
            String minioTargetPrefix = "hls/" + message.getSongId();
            minioHelper.uploadHlsDirectory(outputDir, minioTargetPrefix);

            if (generateMp3Download) {
                ffmpegService.generateMp3320k(localRawFilePath, localMp3FilePath);
                String mp3ObjectKey = "download/" + message.getSongId() + "/song-320kbps.mp3";
                minioHelper.uploadSingleFile(localMp3FilePath, mp3ObjectKey, "audio/mpeg");
            }

            String masterM3u8Path = minioTargetPrefix + "/master.m3u8";
            TranscodeSuccessMessage successMessage = TranscodeSuccessMessage.builder()
                    .songId(message.getSongId())
                    .duration(duration)
                    .hlsMasterUrl(masterM3u8Path)
                    .build();

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.MUSIC_EXCHANGE,
                    RabbitMQConfig.TRANSCODE_SUCCESS_ROUTING_KEY,
                    successMessage
            );

            channel.basicAck(deliveryTag, false);
            log.info("==== TRANSCODING SUCCESS: {} ====", message.getSongId());

        } catch (Exception e) {
            log.error("==== TRANSCODING FAILED FOR SONG: {} ====", message.getSongId(), e);
            handleFailure(channel, deliveryTag, message);
        } finally {
            cleanupTempFiles(localRawFilePath, outputDir, localMp3FilePath);
        }
    }

    private void handleFailure(Channel channel, long deliveryTag, TranscodeSongMessage message) {
        try {
            channel.basicNack(deliveryTag, false, false);
            log.warn("Message for song {} sent to DLQ", message.getSongId());
        } catch (IOException e) {
            log.error("Failed to NACK message for song {}", message.getSongId(), e);
        }
    }

    private void cleanupTempFiles(String rawFilePath, String outputDir, String mp3FilePath) {
        try {
            new File(rawFilePath).delete();
            new File(mp3FilePath).delete();

            File dir = new File(outputDir);
            if (dir.exists()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File file : files) file.delete();
                }
                dir.delete();
            }
            log.info("Cleaned up temporary files.");
        } catch (Exception e) {
            log.warn("Failed to clean up temp files", e);
        }
    }
}