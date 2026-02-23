package iuh.fit.se.transcoder.service;

import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.TranscodeSongMessage;
import iuh.fit.se.core.dto.message.TranscodeSuccessMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscodeListener {

    private final MinioHelper minioHelper;
    private final FfmpegService ffmpegService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConfig.TRANSCODE_QUEUE)
    public void handleTranscodeRequest(TranscodeSongMessage message) {
        log.info("==== START TRANSCODING FOR SONG: {} ====", message.getSongId());

        String tmpDir = System.getProperty("java.io.tmpdir");
        String localRawFilePath = Paths.get(tmpDir, message.getSongId() + "." + message.getFileExtension()).toString();
        String outputDir = Paths.get(tmpDir, "output_" + message.getSongId()).toString();

        try {
            new File(outputDir).mkdirs();

            minioHelper.downloadRawFile(message.getRawFileKey(), localRawFilePath);

            int duration = ffmpegService.getDuration(localRawFilePath);
            log.info("Duration calculated: {} seconds", duration);

            log.info("FFMPEG is chopping the audio...");
            ffmpegService.generateHls(localRawFilePath, outputDir);

            String minioTargetPrefix = "hls/" + message.getSongId();
            minioHelper.uploadHlsDirectory(outputDir, minioTargetPrefix);

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

            log.info("==== TRANSCODING SUCCESS: {} - Sent callback to Music Service ====", message.getSongId());

        } catch (Exception e) {
            log.error("==== TRANSCODING FAILED FOR SONG: {} ====", message.getSongId(), e);
        } finally {
            cleanupTempFiles(localRawFilePath, outputDir);
        }
    }

    private void cleanupTempFiles(String rawFilePath, String outputDir) {
        try {
            File rawFile = new File(rawFilePath);
            if (rawFile.exists()) rawFile.delete();

            File dir = new File(outputDir);
            if (dir.exists()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File file : files) {
                        file.delete();
                    }
                }
                dir.delete();
            }
            log.info("Cleaned up temporary files.");
        } catch (Exception e) {
            log.warn("Failed to clean up temp files", e);
        }
    }
}