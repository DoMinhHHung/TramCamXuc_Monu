package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.Genre;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

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
    private ArtistSummary primaryArtist;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ArtistSummary {
        private UUID id;
        private UUID userId;
        private String stageName;
        private String avatarUrl;
    }
}