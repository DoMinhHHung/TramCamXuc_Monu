package iuh.fit.se.transcoder.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${transcoder.timeout-minutes:30}")
    private int transcodeTimeoutMinutes;

    @Value("${transcoder.hls.segment-duration-seconds:6}")
    private int hlsSegmentDuration;

    @Value("${transcoder.hls.bitrates:64k,128k,192k,320k}")
    private String hlsBitrates;

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
        String[] bitrates = hlsBitrates.split(",");

        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-y");
        command.add("-i"); command.add(inputFilePath);

        for (int i = 0; i < bitrates.length; i++) {
            command.add("-map"); command.add("0:a");
            command.add("-b:a:" + i); command.add(bitrates[i].trim());
        }

        command.add("-c:a"); command.add("aac");
        command.add("-f"); command.add("hls");
        command.add("-hls_time"); command.add(String.valueOf(hlsSegmentDuration));
        command.add("-hls_playlist_type"); command.add("vod");
        command.add("-hls_flags"); command.add("independent_segments");
        command.add("-master_pl_name"); command.add("master.m3u8");

        StringBuilder streamMap = new StringBuilder();
        for (int i = 0; i < bitrates.length; i++) {
            if (i > 0) streamMap.append(' ');
            streamMap.append("a:").append(i).append(",agroup:audio,name:").append(bitrates[i].trim());
        }

        command.add("-var_stream_map");
        command.add(streamMap.toString());
        command.add(outputDir + "/stream_%v.m3u8");

        runWithTimeout(command, transcodeTimeoutMinutes, "HLS transcode");
    }

    public void generateMp3320k(String inputFilePath, String outputFilePath) throws Exception {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-y");
        command.add("-i"); command.add(inputFilePath);
        command.add("-c:a"); command.add("libmp3lame");
        command.add("-b:a"); command.add("320k");
        command.add(outputFilePath);

        runWithTimeout(command, transcodeTimeoutMinutes, "MP3 320k encode");
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
