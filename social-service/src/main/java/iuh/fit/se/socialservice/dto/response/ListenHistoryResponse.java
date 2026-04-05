package iuh.fit.se.socialservice.dto.response;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenHistoryResponse {
    private String id;
    private UUID userId;
    private UUID songId;
    private UUID artistId;
    private UUID playlistId;
    private UUID albumId;
    private int durationSeconds;
    private Instant listenedAt;
}
