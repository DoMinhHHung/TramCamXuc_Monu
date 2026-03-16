package iuh.fit.se.adsservice.event;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Consumed from song.listen.fanout.exchange — same shape as social-service's SongListenEvent.
 */
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
