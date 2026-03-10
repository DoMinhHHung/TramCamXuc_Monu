package iuh.fit.se.transcoderservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Wrapper cho ffmpeg và ffprobe.
 *
 * Output HLS gồm 4 bitrate: 64k / 128k / 256k / 320k
 * — stream_64k.m3u8, stream_128k.m3u8, stream_256k.m3u8, stream_320k.m3u8
 * — master.m3u8 (multi-bitrate playlist)
 *
 * File MP3 320kbps cho tính năng download (Premium).
 */
@Service
@Slf4j
public class FfmpegService {

    private static final int TRANSCODE_TIMEOUT_MINUTES = 30;

    // ────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Lấy thời lượng bài hát (giây) bằng ffprobe.
     */
    public int getDuration(String inputFilePath) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                inputFilePath
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()));
        String line = reader.readLine();

        boolean finished = process.waitFor(60, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException(
                    "ffprobe timed out after 60s for: " + inputFilePath);
        }

        if (line != null && !line.isBlank()) {
            return (int) Math.ceil(Double.parseDouble(line.trim()));
        }
        return 0;
    }

    /**
     * Tạo HLS multi-bitrate từ file raw.
     *
     * Output tại outputDir:
     *   master.m3u8
     *   stream_64k.m3u8  + *.ts
     *   stream_128k.m3u8 + *.ts
     *   stream_256k.m3u8 + *.ts
     *   stream_320k.m3u8 + *.ts
     */
    public void generateHls(String inputFilePath, String outputDir) throws Exception {
        List<String> cmd = new ArrayList<>();
        cmd.add("ffmpeg");
        cmd.add("-y");
        cmd.add("-i");          cmd.add(inputFilePath);
        cmd.add("-c:a");        cmd.add("aac");
        // 4 output streams, mỗi cái map audio channel 0
        cmd.add("-map"); cmd.add("0:a");
        cmd.add("-map"); cmd.add("0:a");
        cmd.add("-map"); cmd.add("0:a");
        cmd.add("-map"); cmd.add("0:a");
        cmd.add("-b:a:0"); cmd.add("64k");
        cmd.add("-b:a:1"); cmd.add("128k");
        cmd.add("-b:a:2"); cmd.add("256k");
        cmd.add("-b:a:3"); cmd.add("320k");
        cmd.add("-f");              cmd.add("hls");
        cmd.add("-hls_time");       cmd.add("4");
        cmd.add("-hls_playlist_type"); cmd.add("vod");
        cmd.add("-master_pl_name"); cmd.add("master.m3u8");
        cmd.add("-var_stream_map");
        cmd.add("a:0,agroup:audio,name:64k "
              + "a:1,agroup:audio,name:128k "
              + "a:2,agroup:audio,name:256k "
              + "a:3,agroup:audio,name:320k");
        cmd.add(outputDir + "/stream_%v.m3u8");

        runWithTimeout(cmd, TRANSCODE_TIMEOUT_MINUTES, "HLS transcode");
    }

    /**
     * Tạo file MP3 320kbps — dùng cho tính năng download của Premium.
     */
    public void generateMp3320k(String inputFilePath, String outputFilePath) throws Exception {
        List<String> cmd = new ArrayList<>();
        cmd.add("ffmpeg");
        cmd.add("-y");
        cmd.add("-i");    cmd.add(inputFilePath);
        cmd.add("-c:a");  cmd.add("libmp3lame");
        cmd.add("-b:a");  cmd.add("320k");
        cmd.add(outputFilePath);

        runWithTimeout(cmd, TRANSCODE_TIMEOUT_MINUTES, "MP3 320k encode");
    }

    // ────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────────────────────────────

    private void runWithTimeout(List<String> command,
                                int timeoutMinutes,
                                String jobName) throws Exception {
        log.info("[{}] Executing: {}", jobName, String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(false);
        Process process = pb.start();

        // Drain stdout/stderr trên daemon threads để tránh buffer block
        Thread stdoutDrainer = drainThread(
                process.getInputStream(), jobName + "[stdout]");
        Thread stderrDrainer = drainThread(
                process.getErrorStream(), jobName + "[stderr]");
        stdoutDrainer.start();
        stderrDrainer.start();

        boolean finished = process.waitFor(timeoutMinutes, TimeUnit.MINUTES);

        if (!finished) {
            process.destroyForcibly();
            stdoutDrainer.interrupt();
            stderrDrainer.interrupt();
            throw new RuntimeException(
                    jobName + " timed out after " + timeoutMinutes + " minutes");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new RuntimeException(
                    jobName + " failed with exit code " + exitCode);
        }

        log.info("[{}] Completed successfully.", jobName);
    }

    private Thread drainThread(InputStream stream, String label) {
        Thread t = new Thread(() -> {
            try (BufferedReader reader =
                         new BufferedReader(new InputStreamReader(stream))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.debug("[{}] {}", label, line);
                }
            } catch (IOException e) {
                log.trace("[{}] Stream closed: {}", label, e.getMessage());
            }
        });
        t.setDaemon(true);
        return t;
    }
}
