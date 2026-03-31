package iuh.fit.se.transcoderservice.service;

import com.rabbitmq.client.Channel;
import iuh.fit.se.transcoderservice.config.RabbitMQConfig;
import iuh.fit.se.transcoderservice.dto.TranscodeFailedMessage;
import iuh.fit.se.transcoderservice.dto.TranscodeSongMessage;
import iuh.fit.se.transcoderservice.dto.TranscodeSuccessMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class TranscodeWorkerService {

    private final MinioHelper minioHelper;
    private final FfmpegService ffmpegService;
    private final RabbitTemplate rabbitTemplate;
    private final ExecutorService transcodeExecutor;

    public TranscodeWorkerService(MinioHelper minioHelper,
                                  FfmpegService ffmpegService,
                                  RabbitTemplate rabbitTemplate,
                                  @Qualifier("transcodeExecutor") ExecutorService transcodeExecutor) {
        this.minioHelper = minioHelper;
        this.ffmpegService = ffmpegService;
        this.rabbitTemplate = rabbitTemplate;
        this.transcodeExecutor = transcodeExecutor;
    }

    public void process(TranscodeSongMessage message, Channel channel, long deliveryTag) {
        UUID songId = message.getSongId();
        log.info("==== START TRANSCODING song={} ====", songId);

        String tmpDir       = System.getProperty("java.io.tmpdir");
        String localRawPath = Paths.get(tmpDir, songId + "." + message.getFileExtension()).toString();
        String hlsOutputDir = Paths.get(tmpDir, "hls_" + songId).toString();
        String localMp3Path = Paths.get(tmpDir, songId + "-320kbps.mp3").toString();

        List<Process> activeProcesses = new CopyOnWriteArrayList<>();

        CompletableFuture<Void> fMp3 = null;

        try {
            new File(hlsOutputDir).mkdirs();
            minioHelper.downloadRawFile(message.getRawFileKey(), localRawPath);

            int duration = ffmpegService.getDuration(localRawPath);

            final String rawPath   = localRawPath;
            final String outputDir = hlsOutputDir;
            final String mp3Path   = localMp3Path;

            CompletableFuture<Void> f64k  = CompletableFuture.runAsync(
                    () -> runVariant(rawPath, outputDir, "64k",  "64k",  activeProcesses),
                    transcodeExecutor);

            CompletableFuture<Void> f128k = CompletableFuture.runAsync(
                    () -> runVariant(rawPath, outputDir, "128k", "128k", activeProcesses),
                    transcodeExecutor);

            CompletableFuture<Void> f256k = CompletableFuture.runAsync(
                    () -> runVariant(rawPath, outputDir, "256k", "256k", activeProcesses),
                    transcodeExecutor);

            CompletableFuture<Void> f320k = CompletableFuture.runAsync(
                    () -> runVariant(rawPath, outputDir, "320k", "320k", activeProcesses),
                    transcodeExecutor);

            fMp3 = CompletableFuture.runAsync(
                    () -> runMp3(rawPath, mp3Path, activeProcesses),
                    transcodeExecutor);

            // ── Chờ tất cả HLS variant xong ──────────────────────────────────
            try {
                CompletableFuture.allOf(f64k, f128k, f256k, f320k).join();
            } catch (CompletionException e) {
                killAllActiveProcesses(activeProcesses, songId);

                fMp3.cancel(true);
                try {
                    fMp3.get(5, TimeUnit.SECONDS);
                } catch (Exception ignored) {
                }

                Throwable root = e.getCause();
                throw new RuntimeException(
                        "One or more HLS variants failed: " + (root != null ? root.getMessage() : e.getMessage()),
                        root != null ? root : e);
            }

            ffmpegService.writeMasterPlaylist(hlsOutputDir);

            try {
                fMp3.get(5 * 60, TimeUnit.SECONDS);
            } catch (CancellationException e) {
                log.warn("[song={}] MP3 was cancelled", songId);
            } catch (ExecutionException e) {
                log.warn("[song={}] MP3 generation failed (non-fatal): {}",
                        songId, e.getCause() != null ? e.getCause().getMessage() : e.getMessage());
            } catch (TimeoutException e) {
                log.warn("[song={}] MP3 generation timed out waiting 5min (non-fatal)", songId);
                killAllActiveProcesses(activeProcesses, songId);
            }

            String hlsMinioPrefix = "hls/" + songId;
            minioHelper.uploadHlsDirectory(hlsOutputDir, hlsMinioPrefix);

            String mp3ObjectKey = "download/" + songId + "/song-320kbps.mp3";
            minioHelper.uploadDownloadFile(localMp3Path, mp3ObjectKey, "audio/mpeg");

            String masterUrl = hlsMinioPrefix + "/master.m3u8";
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.MUSIC_EXCHANGE,
                    RabbitMQConfig.TRANSCODE_SUCCESS_ROUTING_KEY,
                    TranscodeSuccessMessage.builder()
                            .songId(songId)
                            .duration(duration)
                            .hlsMasterUrl(masterUrl)
                            .build()
            );

            ack(channel, deliveryTag, songId);
            log.info("==== TRANSCODE SUCCESS song={} ====", songId);

        } catch (Exception e) {
            log.error("==== TRANSCODE FAILED song={} ====", songId, e);

            killAllActiveProcesses(activeProcesses, songId);

            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.MUSIC_EXCHANGE,
                        RabbitMQConfig.TRANSCODE_FAILED_ROUTING_KEY,
                        TranscodeFailedMessage.builder()
                                .songId(songId)
                                .error(e.getMessage())
                                .build()
                );
            } catch (Exception publishErr) {
                log.error("Failed to publish transcode failure event song={}", songId, publishErr);
            }
            nack(channel, deliveryTag, songId);
        } finally {
            cleanup(localRawPath, hlsOutputDir, localMp3Path);
        }
    }


    private void killAllActiveProcesses(List<Process> processes, UUID songId) {
        int killed = 0;
        for (Process p : processes) {
            if (p.isAlive()) {
                p.destroyForcibly();
                killed++;
            }
        }
        if (killed > 0) {
            log.warn("[song={}] Force-killed {} orphaned ffmpeg process(es)", songId, killed);
        }
    }

    private void runVariant(String rawPath, String outputDir,
                            String bitrate, String variantName,
                            List<Process> processTracker) {
        try {
            ffmpegService.generateHlsVariant(rawPath, outputDir, bitrate, variantName, processTracker);
        } catch (Exception e) {
            throw new RuntimeException("HLS " + bitrate + " failed: " + e.getMessage(), e);
        }
    }

    private void runMp3(String rawPath, String mp3Path, List<Process> processTracker) {
        try {
            ffmpegService.generateMp3320k(rawPath, mp3Path, processTracker);
        } catch (Exception e) {
            throw new RuntimeException("MP3 encode failed: " + e.getMessage(), e);
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
                    for (File f : files) f.delete();
                }
                dir.delete();
            }
        } catch (Exception e) {
            log.warn("Failed to clean up tmp files: {}", e.getMessage());
        }
    }
}