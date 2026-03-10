package iuh.fit.se.musicservice.dto.jamendo;

import lombok.*;

import java.io.Serializable;
import java.util.List;

/**
 * RabbitMQ message payload published to {@code jamendo.exchange} with routing key
 * {@code jamendo.download.routing}.
 *
 * <p>The publisher ({@code JamendoImportServiceImpl}) sets all fields from the
 * Jamendo API response.  The worker ({@code JamendoDownloadWorker}) uses them
 * to download the MP3, build the {@link iuh.fit.se.musicservice.entity.Song}
 * entity, and trigger transcode.</p>
 *
 * <p>Implements {@link Serializable} as a safety net, but Jackson JSON
 * serialisation is the actual transport format (configured in RabbitMQConfig).</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JamendoDownloadMessage implements Serializable {

    /**
     * Jamendo's own track ID — the primary idempotency key.
     * The worker performs a final DB check before saving to prevent
     * duplicates from message redelivery.
     */
    private String jamendoId;

    /** Track title — stored as {@code Song.title}. */
    private String title;

    /**
     * Direct MP3 download URL from Jamendo CDN.
     * The worker fetches this URL into a {@code byte[]} using RestTemplate.
     */
    private String audioUrl;

    /** Album art thumbnail URL. Stored as {@code Song.thumbnailUrl}. */
    private String thumbnailUrl;

    /** Artist stage name — denormalised into {@code Song.primaryArtistStageName}. */
    private String artistStageName;

    /** Jamendo artist ID — used to look up or synthesise the Artist entity. */
    private String artistJamendoId;

    /** Track duration in seconds as reported by Jamendo API. */
    private int durationSeconds;

    /**
     * Raw genre tags from Jamendo musicinfo.
     * The worker applies the whitelist filter before creating Genre rows.
     */
    private List<String> genreTags;
}