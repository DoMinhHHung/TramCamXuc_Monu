package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Album response DTO - Decoupled from identity-service.
 * Uses ownerArtistId instead of nested owner object.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumResponse {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String coverUrl;
    private LocalDate releaseDate;
    private ZonedDateTime scheduledPublishAt;
    private AlbumStatus status;

    private int totalSongs;
    private int totalDurationSeconds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Loose reference to Artist from identity-service.
     * TODO: Fetch Artist info (name, avatar) via FeignClient or CQRS Event
     * Client should call identity-service to get full artist details.
     */
    private String ownerArtistId;

    private List<AlbumSongResponse> songs;
}