package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.config.WaveformProperties;
import iuh.fit.se.musicservice.dto.response.WaveformDataResponse;
import iuh.fit.se.musicservice.enums.WaveformFormat;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.service.WaveformService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaveformServiceImpl implements WaveformService {

    private final MinioStorageService storageService;
    private final ObjectMapper objectMapper;
    private final WaveformProperties waveformProps;
    private final RedisTemplate<String, String> redisTemplate;

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC METHODS
    // ──────────────────────────────────────────────────────────────────────────

    @Override
    public String generateAndSaveWaveform(UUID songId, String rawFileKey) {
        try {
            log.info("Generating waveform for song: {} (async={})", songId, waveformProps.isAsyncProcessing());

            // Download audio file from MinIO
            byte[] audioData = storageService.readRawObject(rawFileKey);

            // Check file size
            if (audioData.length > waveformProps.getMaxFileSizeMb() * 1024 * 1024) {
                log.warn("Audio file too large: {} MB for song {}", 
                    audioData.length / 1024 / 1024, songId);
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            // Extract waveform data
            List<Float> waveformData = extractWaveformFromAudio(audioData);

            // Generate and save formats
            if (waveformProps.isAsyncProcessing()) {
                generateFormatsAsync(songId, waveformData);
            } else {
                generateFormatsSync(songId, waveformData);
            }

            // Clear cache
            clearWaveformCache(songId);

            // Return PNG URL as default
            return getWaveformUrl(songId, WaveformFormat.PNG);

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to generate waveform for song: {}", songId, e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Cacheable(value = "waveformData", key = "#songId.toString()", unless = "#result == null")
    public WaveformDataResponse getWaveformDataComplete(UUID songId) {
        try {
            List<Float> amplitudes = getWaveformData(songId);
            
            // Calculate stats
            float peak = amplitudes.stream().max(Float::compare).orElse(0f);
            float rms = (float) Math.sqrt(
                amplitudes.stream().mapToDouble(a -> a * a).average().orElse(0)
            );

            // Build format URLs
            WaveformDataResponse.FormatUrls.FormatUrlsBuilder urlsBuilder = 
                WaveformDataResponse.FormatUrls.builder();
            
            String[] formats = waveformProps.getEnabledFormats().split(",");
            List<String> availableFormats = new ArrayList<>();

            for (String format : formats) {
                String url = getWaveformUrl(songId, WaveformFormat.fromString(format));
                if (url != null) {
                    availableFormats.add(format.toUpperCase().trim());
                    switch (WaveformFormat.fromString(format)) {
                        case PNG -> urlsBuilder.pngUrl(url);
                        case SVG -> urlsBuilder.svgUrl(url);
                        case JSON -> urlsBuilder.jsonUrl(url);
                    }
                }
            }

            return WaveformDataResponse.builder()
                    .amplitudes(amplitudes)
                    .sampleCount(amplitudes.size())
                    .peakAmplitude(peak)
                    .rmsAmplitude(rms)
                    .availableFormats(availableFormats)
                    .formatUrls(urlsBuilder.build())
                    .build();

        } catch (Exception e) {
            log.error("Failed to get complete waveform data for song: {}", songId, e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Cacheable(value = "waveformRawData", key = "#songId.toString()", unless = "#result == null")
    public List<Float> getWaveformData(UUID songId) {
        try {
            String waveformJsonKey = String.format("waveforms/%s%s", songId, WaveformFormat.JSON.fileSuffix);

            if (!storageService.objectExists(waveformJsonKey)) {
                throw new AppException(ErrorCode.NOT_FOUND);
            }

            byte[] jsonData = storageService.readRawObject(waveformJsonKey);
            return objectMapper.readValue(jsonData,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Float.class));
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to get waveform data for song: {}", songId, e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public String getWaveformUrl(UUID songId, WaveformFormat format) {
        try {
            String key = String.format("waveforms/%s%s", songId, format.fileSuffix);
            if (storageService.objectExists(key)) {
                return storageService.getPublicUrl(key);
            }
            return null;
        } catch (Exception e) {
            log.debug("Waveform format {} not found for song {}", format, songId);
            return null;
        }
    }

    @Override
    @CacheEvict(value = {"waveformData", "waveformRawData"}, key = "#songId.toString()")
    public void deleteWaveformData(UUID songId) {
        try {
            for (WaveformFormat format : WaveformFormat.values()) {
                String key = String.format("waveforms/%s%s", songId, format.fileSuffix);
                storageService.deleteRawObject(key);
            }
            log.info("Waveform data deleted for song: {}", songId);
        } catch (Exception e) {
            log.warn("Failed to delete waveform data for song: {}", songId, e);
        }
    }

    @Override
    public void clearWaveformCache(UUID songId) {
        String keyPrefix = waveformProps.getCacheKeyPrefix();
        try {
            if (waveformProps.isCacheEnabled()) {
                redisTemplate.delete(keyPrefix + songId);
                log.debug("Cleared waveform cache for song: {}", songId);
            }
        } catch (Exception e) {
            log.warn("Failed to clear waveform cache for song: {}", songId, e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE METHODS
    // ──────────────────────────────────────────────────────────────────────────

    @Async
    private void generateFormatsAsync(UUID songId, List<Float> waveformData) {
        try {
            generateFormatsSync(songId, waveformData);
        } catch (Exception e) {
            log.error("Async waveform generation failed for song: {}", songId, e);
        }
    }

    private void generateFormatsSync(UUID songId, List<Float> waveformData) {
        String[] enabledFormats = waveformProps.getEnabledFormats().split(",");

        for (String format : enabledFormats) {
            try {
                WaveformFormat wf = WaveformFormat.fromString(format);
                switch (wf) {
                    case PNG -> generateAndSavePng(songId, waveformData);
                    case SVG -> generateAndSaveSvg(songId, waveformData);
                    case JSON -> generateAndSaveJson(songId, waveformData);
                }
                log.debug("Generated {} waveform for song: {}", wf, songId);
            } catch (Exception e) {
                log.warn("Failed to generate {} waveform for song: {}", format, songId, e);
            }
        }
    }

    private void generateAndSavePng(UUID songId, List<Float> waveformData) throws IOException {
        String key = String.format("waveforms/%s%s", songId, WaveformFormat.PNG.fileSuffix);
        byte[] pngData = generateWaveformPng(waveformData);
        storageService.uploadRawBytes(key, pngData, WaveformFormat.PNG.mimeType);
    }

    private void generateAndSaveSvg(UUID songId, List<Float> waveformData) throws IOException {
        String key = String.format("waveforms/%s%s", songId, WaveformFormat.SVG.fileSuffix);
        byte[] svgData = generateWaveformSvg(waveformData);
        storageService.uploadRawBytes(key, svgData, WaveformFormat.SVG.mimeType);
    }

    private void generateAndSaveJson(UUID songId, List<Float> waveformData) throws IOException {
        String key = String.format("waveforms/%s%s", songId, WaveformFormat.JSON.fileSuffix);
        byte[] jsonData = objectMapper.writeValueAsBytes(waveformData);
        storageService.uploadRawBytes(key, jsonData, WaveformFormat.JSON.mimeType);
    }

    private List<Float> extractWaveformFromAudio(byte[] audioData) {
        List<Float> waveformData = new ArrayList<>();
        int samples = waveformProps.getSamples();

        try {
            int sampleCount = audioData.length / 2;
            int samplesPerPoint = Math.max(1, sampleCount / samples);
            float maxAmplitude = 0;
            float[] peaks = new float[samples];

            // Find peaks
            for (int i = 0; i < samples; i++) {
                int startPos = i * samplesPerPoint * 2;
                float peak = 0;

                for (int j = 0; j < samplesPerPoint && (startPos + j * 2 + 1) < audioData.length; j++) {
                    short sample = ByteBuffer.wrap(audioData, startPos + j * 2, 2)
                            .order(ByteOrder.LITTLE_ENDIAN)
                            .getShort();
                    peak = Math.max(peak, Math.abs(sample) / 32768.0f);
                }

                peaks[i] = peak;
                maxAmplitude = Math.max(maxAmplitude, peak);
            }

            // Normalize
            if (maxAmplitude == 0) maxAmplitude = 1;
            for (float peak : peaks) {
                waveformData.add(Math.min(100, (peak / maxAmplitude) * 100));
            }

            log.debug("Extracted {} waveform points", waveformData.size());
            return waveformData;

        } catch (Exception e) {
            log.warn("Error extracting waveform, returning fallback", e);
            for (int i = 0; i < samples; i++) {
                waveformData.add((float) (Math.random() * 30));
            }
            return waveformData;
        }
    }

    private byte[] generateWaveformPng(List<Float> waveformData) throws IOException {
        int width = waveformProps.getPngWidth();
        int height = waveformProps.getPngHeight();
        Color waveColor = hexToColor(waveformProps.getPngColor());
        Color bgColor = hexToColor(waveformProps.getPngBackgroundColor());
        Color centerColor = hexToColor(waveformProps.getPngCenterLineColor());

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = image.createGraphics();

        g2d.setColor(bgColor);
        g2d.fillRect(0, 0, width, height);

        g2d.setColor(centerColor);
        int centerY = height / 2;
        g2d.drawLine(0, centerY, width, centerY);

        g2d.setColor(waveColor);
        g2d.setStroke(new BasicStroke(2.0f));

        float pixelsPerSample = (float) width / waveformData.size();
        for (int i = 0; i < waveformData.size() - 1; i++) {
            float amp1 = waveformData.get(i);
            float amp2 = waveformData.get(i + 1);

            int x1 = (int) (i * pixelsPerSample);
            int x2 = (int) ((i + 1) * pixelsPerSample);
            int y1 = centerY - (int) (amp1 * (centerY - 10) / 100);
            int y2 = centerY - (int) (amp2 * (centerY - 10) / 100);

            g2d.drawLine(x1, y1, x2, y2);
            g2d.drawLine(x1, height - y1, x2, height - y2);
        }

        g2d.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }

    private byte[] generateWaveformSvg(List<Float> waveformData) throws IOException {
        int height = waveformProps.getSvgHeight();
        float strokeWidth = waveformProps.getSvgStrokeWidth();
        String waveColor = waveformProps.getPngColor();

        StringBuilder svg = new StringBuilder();
        svg.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        svg.append("<svg xmlns=\"http://www.w3.org/2000/svg\" ")
           .append("width=\"").append(waveformProps.getSvgWidth()).append("\" ")
           .append("height=\"").append(height).append("\" ")
           .append("viewBox=\"0 0 ").append(waveformData.size()).append(" ").append(height).append("\">\n");

        svg.append("<defs><style>")
           .append(".waveform-line { stroke: #").append(waveColor).append("; stroke-width: ").append(strokeWidth).append("; }")
           .append("</style></defs>\n");

        int centerY = height / 2;
        svg.append("<line x1=\"0\" y1=\"").append(centerY).append("\" x2=\"").append(waveformData.size())
           .append("\" y2=\"").append(centerY).append("\" class=\"waveform-line\" opacity=\"0.3\"/>\n");

        svg.append("<polyline points=\"");
        for (int i = 0; i < waveformData.size(); i++) {
            float amp = waveformData.get(i);
            int y = centerY - (int) (amp * (centerY - 5) / 100);
            svg.append(i).append(",").append(y).append(" ");
        }
        svg.append("\" class=\"waveform-line\" fill=\"none\"/>\n");

        svg.append("</svg>");
        return svg.toString().getBytes();
    }

    private Color hexToColor(String hex) {
        try {
            return new Color(
                Integer.valueOf(hex.substring(0, 2), 16),
                Integer.valueOf(hex.substring(2, 4), 16),
                Integer.valueOf(hex.substring(4, 6), 16)
            );
        } catch (Exception e) {
            return new Color(52, 211, 153);  // Default green
        }
    }
}

