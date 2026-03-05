package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.Genre;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Song response DTO - Decoupled from identity-service.
 * Uses artistId instead of nested ArtistSummary object.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SongResponse {
    private UUID id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;

    private SongStatus status;
    private TranscodeStatus transcodeStatus;

    private String uploadUrl;
    private String streamUrl;

    private Set<Genre> genres;

    /**
     * Loose reference to Artist from identity-service.
     * TODO: Fetch Artist info (name, avatar) via FeignClient or CQRS Event
     * Client should call identity-service to get full artist details.
     */
    private String artistId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}