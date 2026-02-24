package iuh.fit.se.music.dto.response;

import iuh.fit.se.music.enums.AlbumApprovalStatus;
import iuh.fit.se.music.enums.AlbumVisibility;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlbumResponse {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String coverUrl;
    private LocalDate releaseDate;
    private ZonedDateTime scheduledPublishAt;
    private AlbumApprovalStatus approvalStatus;
    private AlbumVisibility visibility;
    private String rejectionReason;
    private LocalDateTime reviewedAt;

    private int totalSongs;
    private int totalDurationSeconds;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private UUID ownerArtistId;
    private String ownerArtistName;
    private String ownerArtistAvatar;

    private List<AlbumSongResponse> songs;
}