package iuh.fit.se.musicservice.dto.jamendo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

/**
 * Maps a single track object from the Jamendo REST API response.
 *
 * Example Jamendo API call:
 *   GET https://api.jamendo.com/v3.0/tracks/?client_id={id}&format=json
 *       &limit=50&offset=0&include=musicinfo&audioformat=mp31&order=popularity_total
 *
 * Only the fields we actually use are mapped; all others are safely ignored.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class JamendoTrackDto {

    /** Jamendo's own track identifier. Used as the idempotency key. */
    private String id;

    /** Track title. */
    private String name;

    /** Duration in seconds (Jamendo returns it as a String). */
    private String duration;

    /** Album/track thumbnail image URL. */
    private String image;

    /** Direct MP3 audio download URL (populated when audioformat=mp31). */
    @JsonProperty("audio")
    private String audioUrl;

    /** Artist's display name — denormalised into our Song entity. */
    @JsonProperty("artist_name")
    private String artistName;

    /** Jamendo artist ID — stored as artistJamendoId on the message. */
    @JsonProperty("artist_id")
    private String artistId;

    /**
     * Nested music metadata block.
     * Only present when {@code include=musicinfo} is added to the API query.
     */
    @JsonProperty("musicinfo")
    private MusicInfo musicInfo;

    // ── Nested DTOs ────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MusicInfo {
        private Tags tags;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Tags {
        /** Primary genre tags — these are mapped to our Genre table. */
        private List<String> genres;

        /** Secondary vartags (mood, tempo) — currently ignored. */
        private List<String> vartags;

        /** Instrument tags — currently ignored. */
        private List<String> instruments;
    }

    // ── Convenience helpers ────────────────────────────────────────────────────

    /**
     * Returns the genre tag list safely, never null.
     */
    public List<String> safeGenreTags() {
        if (musicInfo == null || musicInfo.getTags() == null) {
            return List.of();
        }
        List<String> genres = musicInfo.getTags().getGenres();
        return genres != null ? genres : List.of();
    }

    /**
     * Parses the duration string to int seconds. Returns 0 on parse failure.
     */
    public int durationAsSeconds() {
        try {
            return Integer.parseInt(duration);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}