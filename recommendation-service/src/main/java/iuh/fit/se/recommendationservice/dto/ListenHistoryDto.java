package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenHistoryDto {
    private String id;
    private UUID userId;
    private UUID songId;
    private UUID artistId;
    private UUID playlistId;
    private UUID albumId;
    private int durationSeconds;
    private Instant listenedAt;
}