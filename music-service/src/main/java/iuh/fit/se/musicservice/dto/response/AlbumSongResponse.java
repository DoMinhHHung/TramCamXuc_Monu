package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.Genre;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Album-Song relationship response DTO.
 * Decoupled from identity-service - uses artistId instead of nested artist object.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumSongResponse {
    private UUID id;
    private int orderIndex;
    private UUID songId;
    private String songTitle;
    private String songSlug;
    private String songThumbnailUrl;
    private Integer songDurationSeconds;
    private Long songPlayCount;
    private boolean available;
    private String unavailableReason;

    /**
     * Loose reference to Artist from identity-service.
     * TODO: Fetch Artist info (name, avatar) via FeignClient or CQRS Event
     */
    private String artistId;

    private Set<Genre> genres;
    private LocalDateTime addedAt;
}