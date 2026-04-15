package iuh.fit.se.musicservice.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Complete waveform data DTO with metadata.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WaveformDataResponse {

    /** Array of amplitude values (0-100) */
    private List<Float> amplitudes;

    /** Number of samples in waveform */
    @JsonProperty("sample_count")
    private int sampleCount;

    /** Duration of audio in seconds */
    @JsonProperty("duration_seconds")
    private Integer durationSeconds;

    /** Peak amplitude in the waveform */
    @JsonProperty("peak_amplitude")
    private Float peakAmplitude;

    /** RMS (root mean square) of amplitudes */
    @JsonProperty("rms_amplitude")
    private Float rmsAmplitude;

    /** Available formats for this waveform */
    @JsonProperty("available_formats")
    private List<String> availableFormats;

    /** URLs for each format */
    @JsonProperty("format_urls")
    private FormatUrls formatUrls;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FormatUrls {
        @JsonProperty("png_url")
        private String pngUrl;

        @JsonProperty("svg_url")
        private String svgUrl;

        @JsonProperty("json_url")
        private String jsonUrl;
    }
}
