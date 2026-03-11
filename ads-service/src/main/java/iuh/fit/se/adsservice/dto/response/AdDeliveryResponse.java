package iuh.fit.se.adsservice.dto.response;

import lombok.*;

import java.util.UUID;

/**
 * Payload returned to the user client when an ad is due.
 * The client plays the audio, then calls POST /ads/{adId}/played.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdDeliveryResponse {
    private UUID adId;
    private String advertiserName;
    private String title;
    private String description;
    private String audioUrl;      // presigned / CDN URL for the MP3
    private String targetUrl;     // click-through URL (e.g. Grab promo page)
    private int    durationSeconds;
}
