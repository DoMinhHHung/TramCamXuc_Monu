package iuh.fit.se.music.dto.response;

import iuh.fit.se.music.enums.PlaylistVisibility;
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

    private List<PlaylistSongResponse> songs;
}