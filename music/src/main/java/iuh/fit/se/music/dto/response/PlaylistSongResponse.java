package iuh.fit.se.music.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistSongResponse {

    private UUID playlistSongId;
    private UUID prevId;
    private UUID nextId;
    private LocalDateTime addedAt;

    private UUID songId;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;

    private boolean available;
    private String unavailableReason;

    // Artist
    private UUID artistId;
    private String artistStageName;
    private String artistAvatarUrl;
}