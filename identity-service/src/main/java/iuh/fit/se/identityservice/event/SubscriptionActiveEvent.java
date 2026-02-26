package iuh.fit.se.identityservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionActiveEvent {
    private UUID userId;
    private String planName;
    private Map<String, Object> features; //{"quality": "lossless", "offline": true, isArtist: true, noAds: true}
}