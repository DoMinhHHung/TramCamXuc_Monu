package iuh.fit.se.socialservice.dto.message;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongListenEvent {
    private UUID songId;
    private UUID artistId;
    private UUID userId;
    private UUID playlistId;
    private UUID albumId;
    private int durationSeconds;
    private Instant listenedAt;
}
