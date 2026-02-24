package iuh.fit.se.music.dto.response;

import lombok.*;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlbumSongResponse {
    private UUID albumSongId;
    private int orderIndex;
    private UUID songId;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;

    private boolean available;
    private String unavailableReason;

    private UUID artistId;
    private String artistStageName;
    private String artistAvatarUrl;

    private Set<GenreResponse> genres;
}