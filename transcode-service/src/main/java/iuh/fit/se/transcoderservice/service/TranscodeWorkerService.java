package iuh.fit.se.transcoderservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.transcoderservice.config.RabbitMQConfig;
import iuh.fit.se.transcoderservice.dto.TranscodeFailedMessage;
import iuh.fit.se.transcoderservice.dto.TranscodeSongMessage;
import iuh.fit.se.transcoderservice.dto.TranscodeSuccessMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscodeWorkerService {

    private final MinioHelper minioHelper;
    private final FfmpegService ffmpegService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Runs on the Rabbit listener thread so {@link Channel#basicAck}/{@link Channel#basicNack} are valid.
     * Do not offload with @Async — the channel must not be used from another thread.
     */
    public void process(TranscodeSongMessage message, Channel channel, long deliveryTag) {
        log.info("==== START TRANSCODING song={} ====" , message.getSongId());

        String tmpDir = System.getProperty("java.io.tmpdir");
        String localRawPath = Paths.get(tmpDir,
                message.getSongId() + "." + message.getFileExtension()).toString();
        String hlsOutputDir = Paths.get(tmpDir,
                "hls_" + message.getSongId()).toString();
        String localMp3Path = Paths.get(tmpDir,
                message.getSongId() + "-320kbps.mp3").toString();

        try {
            new File(hlsOutputDir).mkdirs();
            minioHelper.downloadRawFile(message.getRawFileKey(), localRawPath);

            int duration = ffmpegService.getDuration(localRawPath);
            ffmpegService.generateHls(localRawPath, hlsOutputDir);

            String hlsMinioPrefix = "hls/" + message.getSongId();
            minioHelper.uploadHlsDirectory(hlsOutputDir, hlsMinioPrefix);

            ffmpegService.generateMp3320k(localRawPath, localMp3Path);

            String mp3ObjectKey = "download/" + message.getSongId() + "/song-320kbps.mp3";
            minioHelper.uploadDownloadFile(localMp3Path, mp3ObjectKey, "audio/mpeg");

            String masterUrl = hlsMinioPrefix + "/master.m3u8";
            TranscodeSuccessMessage successMsg = TranscodeSuccessMessage.builder()
                    .songId(message.getSongId())
                    .duration(duration)
                    .hlsMasterUrl(masterUrl)
                    .build();

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.MUSIC_EXCHANGE,
                    RabbitMQConfig.TRANSCODE_SUCCESS_ROUTING_KEY,
                    successMsg
            );

            ack(channel, deliveryTag, message.getSongId());
            log.info("==== TRANSCODE SUCCESS song={} ====", message.getSongId());
        } catch (Exception e) {
            log.error("==== TRANSCODE FAILED song={} ====", message.getSongId(), e);
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.MUSIC_EXCHANGE,
                        RabbitMQConfig.TRANSCODE_FAILED_ROUTING_KEY,
                        TranscodeFailedMessage.builder()
                                .songId(message.getSongId())
                                .error(e.getMessage())
                                .build()
                );
            } catch (Exception publishErr) {
                log.error("Failed to publish transcode failure event song={}", message.getSongId(), publishErr);
            }
            nack(channel, deliveryTag, message.getSongId());
        } finally {
            cleanup(localRawPath, hlsOutputDir, localMp3Path);
        }
    }

    private void ack(Channel channel, long deliveryTag, UUID songId) {
        try {
            channel.basicAck(deliveryTag, false);
        } catch (IOException ex) {
            log.error("Failed to ACK transcode message song={}", songId, ex);
        }
    }

    private void nack(Channel channel, long deliveryTag, UUID songId) {
        try {
            channel.basicNack(deliveryTag, false, false);
            log.warn("Transcode message NACKed (no requeue) song={}", songId);
        } catch (IOException ex) {
            log.error("Failed to NACK transcode message song={}", songId, ex);
        }
    }

    private void cleanup(String rawPath, String hlsDir, String mp3Path) {
        try {
            new File(rawPath).delete();
            new File(mp3Path).delete();

            File dir = new File(hlsDir);
            if (dir.exists()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File f : files) {
                        f.delete();
                    }
                }
                dir.delete();
            }
            log.debug("Cleaned up tmp files for transcoding job");
        } catch (Exception e) {
            log.warn("Failed to clean up tmp files: {}", e.getMessage());
        }
    }
}
