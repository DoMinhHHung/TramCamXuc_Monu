package iuh.fit.se.core.dto.message;

import lombok.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongListenEvent implements Serializable {
    private UUID songId;
    private UUID artistId;
    private UUID userId;
    private UUID playlistId;
    private UUID albumId;
    private Instant listenedAt;
    private int durationSeconds;
}