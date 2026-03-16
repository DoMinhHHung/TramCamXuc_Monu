package iuh.fit.se.recommendationservice.dto;
import lombok.*;
import java.util.Set;
@Data @NoArgsConstructor @AllArgsConstructor
public class SongDetailDto {
    private String id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;
    private ArtistInfo primaryArtist;
    private Set<GenreInfo> genres;
    private String status;
    private String createdAt;
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ArtistInfo {
        private String artistId;
        private String userId;
        private String stageName;
        private String avatarUrl;
    }
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class GenreInfo {
        private String id;
        private String name;
    }
}