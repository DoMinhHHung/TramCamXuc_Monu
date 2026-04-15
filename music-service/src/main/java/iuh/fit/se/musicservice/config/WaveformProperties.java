package iuh.fit.se.musicservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "waveform")
@Getter
@Setter
public class WaveformProperties {

    private int samples = 200;

    private int pngWidth = 1024;

    private int pngHeight = 128;

    private String pngColor = "34d399"; 

    private String pngBackgroundColor = "ffffff";

    private String pngCenterLineColor = "c8c8c8";

    private String svgWidth = "100%";

    private int svgHeight = 100;

    private float svgStrokeWidth = 1.5f;

    private boolean cacheEnabled = true;

    /** Cache TTL in seconds */
    private int cacheTtlSeconds = 86400;  // 24 hours

    /** Cache key prefix */
    private String cacheKeyPrefix = "waveform:";

    // ── Processing ───────────────────────────────────────────────────────────
    /** Enable async/background processing */
    private boolean asyncProcessing = true;

    /** Thread pool size for waveform generation */
    private int asyncPoolSize = 3;

    /** Maximum file size to process (MB) */
    private int maxFileSizeMb = 100;

    // ── Formats ──────────────────────────────────────────────────────────────
    /** Enabled waveform formats: png, svg, json */
    private String enabledFormats = "png,json";
}
