package iuh.fit.se.musicservice.enums;

/**
 * Supported waveform visualization formats.
 */
public enum WaveformFormat {
    PNG("image/png", ".waveform.png"),
    SVG("image/svg+xml", ".waveform.svg"),
    JSON("application/json", ".waveform.json");

    public final String mimeType;
    public final String fileSuffix;

    WaveformFormat(String mimeType, String fileSuffix) {
        this.mimeType = mimeType;
        this.fileSuffix = fileSuffix;
    }

    public static WaveformFormat fromString(String value) {
        try {
            return WaveformFormat.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return PNG; 
        }
    }
}
