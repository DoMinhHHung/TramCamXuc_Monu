package iuh.fit.se.musicservice.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SoundCloudTrackResponse {

    private String urn;

    private String title;

    private String uploaderName;

    private String uploaderAvatarUrl;

    private String permalinkUrl;

    private String artworkUrl;

    private Integer durationMs;

    private String genre;

    private Integer playbackCount;

    private String streamUrl;

    private String previewUrl;

    private String access;

    private String source;

    private String attributionText;
}