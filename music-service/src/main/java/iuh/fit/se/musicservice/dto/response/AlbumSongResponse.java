package iuh.fit.se.musicservice.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumSongResponse {
    /** ID của AlbumSong node — dùng cho drag-and-drop reorder */
    private UUID albumSongId;
    /** Linked list navigation (cho client reconstruct thứ tự) */
    private UUID prevId;
    private UUID nextId;

    private UUID songId;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;
    private LocalDateTime addedAt;

    private boolean available;
    private String unavailableReason;

    private UUID artistId;
    private String artistStageName;
    private String artistAvatarUrl;

    private Set<GenreResponse> genres;
}
