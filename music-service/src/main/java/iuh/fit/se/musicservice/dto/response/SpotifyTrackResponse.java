package iuh.fit.se.musicservice.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SpotifyTrackResponse {
    private String id;
    private String name;
    private String artistName;
    private String albumName;
    private String imageUrl;
    private String previewUrl;
    private String externalUrl;
    private String spotifyUri;
    private Integer durationMs;
    private Boolean explicit;

    /** Dùng cho frontend hiển thị attribution theo policy */
    private String source;
    private String ownershipText;
}
