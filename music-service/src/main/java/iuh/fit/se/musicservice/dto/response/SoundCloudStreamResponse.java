package iuh.fit.se.musicservice.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SoundCloudStreamResponse {
    private String urn;
    private String title;
    private String uploaderName;
    private String permalinkUrl;
    private String artworkUrl;

    private String streamUrl;

    private String streamUrlFallback;

    private String attributionText;
}