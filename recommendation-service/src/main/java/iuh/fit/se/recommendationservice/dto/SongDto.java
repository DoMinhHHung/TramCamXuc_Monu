package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongDto {
    private UUID id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;
    private ArtistInfo primaryArtist;
    private Set<GenreDto> genres;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArtistInfo {
        private UUID artistId;
        private String stageName;
        private String avatarUrl;
    }
}