package iuh.fit.se.transcoder.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class FfmpegService {

    private static final int TRANSCODE_TIMEOUT_MINUTES = 30;

    public int getDuration(String inputFilePath) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                inputFilePath
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line = reader.readLine();

        boolean finished = process.waitFor(60, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("ffprobe timed out after 60 seconds for: " + inputFilePath);
        }

        if (line != null && !line.isBlank()) {
            return (int) Math.ceil(Double.parseDouble(line.trim()));
        }
        return 0;
    }

    public void generateHls(String inputFilePath, String outputDir) throws Exception {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-y");
        command.add("-i"); command.add(inputFilePath);
        command.add("-c:a"); command.add("aac");
        command.add("-map"); command.add("0:a");
        command.add("-map"); command.add("0:a");
        command.add("-map"); command.add("0:a");
        command.add("-map"); command.add("0:a");
        command.add("-b:a:0"); command.add("64k");
        command.add("-b:a:1"); command.add("128k");
        command.add("-b:a:2"); command.add("256k");
        command.add("-b:a:3"); command.add("320k");
        command.add("-f"); command.add("hls");
        command.add("-hls_time"); command.add("4");
        command.add("-hls_playlist_type"); command.add("vod");
        command.add("-master_pl_name"); command.add("master.m3u8");
        command.add("-var_stream_map");
        command.add("a:0,agroup:audio,name:64k a:1,agroup:audio,name:128k a:2,agroup:audio,name:256k a:3,agroup:audio,name:320k");
        command.add(outputDir + "/stream_%v.m3u8");

        runWithTimeout(command, TRANSCODE_TIMEOUT_MINUTES, "HLS transcode");
    }

    public void generateMp3320k(String inputFilePath, String outputFilePath) throws Exception {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-y");
        command.add("-i"); command.add(inputFilePath);
        command.add("-c:a"); command.add("libmp3lame");
        command.add("-b:a"); command.add("320k");
        command.add(outputFilePath);

        runWithTimeout(command, TRANSCODE_TIMEOUT_MINUTES, "MP3 320k encode");
    }

    private void runWithTimeout(List<String> command, int timeoutMinutes, String jobName) throws Exception {
        log.info("[{}] Executing: {}", jobName, String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(false);
        Process process = pb.start();

        Thread stdoutDrainer = new Thread(() -> drainStream(process.getInputStream(), jobName + " [stdout]"));
        Thread stderrDrainer = new Thread(() -> drainStream(process.getErrorStream(), jobName + " [stderr]"));

        stdoutDrainer.setDaemon(true);
        stderrDrainer.setDaemon(true);
        stdoutDrainer.start();
        stderrDrainer.start();

        boolean finished = process.waitFor(timeoutMinutes, TimeUnit.MINUTES);

        if (!finished) {
            process.destroyForcibly();
            stdoutDrainer.interrupt();
            stderrDrainer.interrupt();
            throw new RuntimeException(jobName + " timed out after " + timeoutMinutes + " minutes. Process killed.");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new RuntimeException(jobName + " failed with exit code " + exitCode);
        }

        log.info("[{}] Completed successfully.", jobName);
    }

    private void drainStream(InputStream stream, String label) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.debug("[{}] {}", label, line);
            }
        } catch (IOException e) {
            log.trace("[{}] Stream closed: {}", label, e.getMessage());
        }
    }
}