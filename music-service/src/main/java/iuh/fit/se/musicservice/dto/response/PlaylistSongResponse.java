package iuh.fit.se.musicservice.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistSongResponse {

    // ── Linked list node info ─────────────────────────────────
    private UUID playlistSongId;
    private UUID prevId;
    private UUID nextId;
    private LocalDateTime addedAt;

    // ── Song info ─────────────────────────────────────────────
    private UUID songId;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;

    // ── Availability ──────────────────────────────────────────
    private boolean available;
    private String unavailableReason;

    // ── Artist info (denormalized) ────────────────────────────
    private UUID artistId;
    private String artistStageName;
    private String artistAvatarUrl;
}
