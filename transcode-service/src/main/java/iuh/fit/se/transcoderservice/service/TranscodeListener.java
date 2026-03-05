package iuh.fit.se.transcoderservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.transcoderservice.config.RabbitMQConfig;
import iuh.fit.se.transcoderservice.dto.TranscodeSongMessage;
import iuh.fit.se.transcoderservice.dto.TranscodeSuccessMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;

/**
 * Worker lắng nghe yêu cầu transcode từ music-service.
 *
 * Flow:
 *  1. Nhận TranscodeSongMessage từ transcode.queue
 *  2. Download file raw từ MinIO
 *  3. ffprobe → lấy duration
 *  4. ffmpeg  → tạo HLS 4 bitrate (64k/128k/256k/320k)
 *  5. Upload HLS lên MinIO public-songs
 *  6. ffmpeg  → tạo MP3 320kbps (cho download Premium)
 *  7. Upload MP3 lên MinIO raw-songs
 *  8. Publish TranscodeSuccessMessage → music-service cập nhật DB
 *  9. Manual ACK
 *
 * Nếu bất kỳ bước nào thất bại → NACK → message đi vào DLQ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TranscodeListener {

    private final MinioHelper minioHelper;
    private final FfmpegService ffmpegService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConfig.TRANSCODE_QUEUE)
    public void handleTranscodeRequest(
            TranscodeSongMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        log.info("==== START TRANSCODING song={} ====", message.getSongId());

        // ── Đường dẫn local tmp ─────────────────────────────────────────────
        String tmpDir          = System.getProperty("java.io.tmpdir");
        String localRawPath    = Paths.get(tmpDir,
                message.getSongId() + "." + message.getFileExtension()).toString();
        String hlsOutputDir    = Paths.get(tmpDir,
                "hls_" + message.getSongId()).toString();
        String localMp3Path    = Paths.get(tmpDir,
                message.getSongId() + "-320kbps.mp3").toString();

        try {
            // 1. Tạo thư mục HLS output
            new File(hlsOutputDir).mkdirs();

            // 2. Download raw file từ MinIO
            minioHelper.downloadRawFile(message.getRawFileKey(), localRawPath);

            // 3. Lấy duration
            int duration = ffmpegService.getDuration(localRawPath);
            log.info("Song {} duration = {}s", message.getSongId(), duration);

            // 4. Tạo HLS
            ffmpegService.generateHls(localRawPath, hlsOutputDir);

            // 5. Upload HLS lên MinIO public-songs
            String hlsMinioPrefix = "hls/" + message.getSongId();
            minioHelper.uploadHlsDirectory(hlsOutputDir, hlsMinioPrefix);

            // 6. Tạo MP3 320kbps
            ffmpegService.generateMp3320k(localRawPath, localMp3Path);

            // 7. Upload MP3 lên MinIO raw-songs (presigned URL để download)
            String mp3ObjectKey = "download/" + message.getSongId() + "/song-320kbps.mp3";
            minioHelper.uploadDownloadFile(localMp3Path, mp3ObjectKey, "audio/mpeg");

            // 8. Publish success message về music-service
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
            log.info("Published TranscodeSuccessMessage for song={}", message.getSongId());

            // 9. ACK — xử lý thành công
            channel.basicAck(deliveryTag, false);
            log.info("==== TRANSCODE SUCCESS song={} ====", message.getSongId());

        } catch (Exception e) {
            log.error("==== TRANSCODE FAILED song={} ====", message.getSongId(), e);
            nack(channel, deliveryTag, message.getSongId().toString());
        } finally {
            cleanup(localRawPath, hlsOutputDir, localMp3Path);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ────────────────────────────────────────────────────────────────────────

    private void nack(Channel channel, long deliveryTag, String songId) {
        try {
            // requeue=false → message đi vào DLQ
            channel.basicNack(deliveryTag, false, false);
            log.warn("Message for song {} sent to DLQ", songId);
        } catch (IOException ex) {
            log.error("Failed to NACK message for song {}", songId, ex);
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
                    for (File f : files) f.delete();
                }
                dir.delete();
            }
            log.debug("Cleaned up tmp files for transcoding job");
        } catch (Exception e) {
            log.warn("Failed to clean up tmp files: {}", e.getMessage());
        }
    }
}
