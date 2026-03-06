package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.PlaylistVisibility;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String coverUrl;
    private UUID ownerId;
    private PlaylistVisibility visibility;
    private int totalSongs;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** null trong list view, populated trong detail view */
    private List<PlaylistSongResponse> songs;
}
