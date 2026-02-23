package iuh.fit.se.transcoder.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class FfmpegService {

    public int getDuration(String inputFilePath) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", inputFilePath
        );
        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line = reader.readLine();
        process.waitFor();

        if (line != null && !line.isBlank()) {
            return (int) Math.ceil(Double.parseDouble(line));
        }
        return 0;
    }

    public void generateHls(String inputFilePath, String outputDir) throws Exception {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-i"); command.add(inputFilePath);

        // Audio
        command.add("-c:a"); command.add("aac");

        // (4 chất lượng khác nhau)
        command.add("-map"); command.add("0:a");
        command.add("-map"); command.add("0:a");
        command.add("-map"); command.add("0:a");
        command.add("-map"); command.add("0:a");

        // Set Bitrate (64k, 128k, 256k, 320k)
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

        log.info("Executing FFmpeg command: {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line;
        while ((line = reader.readLine()) != null) {
             log.debug(line);
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("FFmpeg processing failed with exit code " + exitCode);
        }
    }
}