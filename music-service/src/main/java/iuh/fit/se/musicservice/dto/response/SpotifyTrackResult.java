package iuh.fit.se.musicservice.dto.response;

import lombok.Data;

@Data
public class SpotifyTrackResult {
    private String id;
    private String name;
    private String artistName;
    private String artistSpotifyUrl;
    private String albumName;
    private String thumbnailUrl;
    private String uri;           // spotify:track:xxx — dùng deep link
    private String spotifyUrl;    // https://open.spotify.com/track/xxx
    private String previewUrl;    // có thể null
    private int durationSeconds;
    private boolean explicit;
}