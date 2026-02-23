package iuh.fit.se.music.dto.response;

import iuh.fit.se.music.enums.ApprovalStatus;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.enums.TranscodeStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongResponse {
    private UUID id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;

    private SongStatus status;
    private ApprovalStatus approvalStatus;
    private TranscodeStatus transcodeStatus;
    private String rejectionReason;
    private LocalDateTime reviewedAt;

    private ArtistSummary primaryArtist;
    private Set<GenreResponse> genres;

    private String uploadUrl;
    private String streamUrl;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ArtistSummary {
        private UUID id;
        private UUID userId;
        private String stageName;
        private String avatarUrl;
    }
}