package iuh.fit.se.recommendationservice.dto;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor
public class FeedContentEventDto {
    private String contentId;
    private String contentType;
    private String artistId;
    private String title;
    private String coverImageUrl;
    private String visibility;
    private String publishedAt;
}