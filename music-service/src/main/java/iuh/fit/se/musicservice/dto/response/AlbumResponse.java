package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumResponse {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String coverUrl;
    private LocalDate releaseDate;
    private ZonedDateTime scheduledPublishAt;
    private ZonedDateTime scheduleCommittedAt;
    private String credits;
    private ZonedDateTime publishedAt;
    private AlbumStatus status;

    private int totalSongs;
    private int totalDurationSeconds;

    private UUID ownerArtistId;
    private String ownerStageName;
    private String ownerAvatarUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** null trong list view, populated trong detail view */
    private List<AlbumSongResponse> songs;
}
