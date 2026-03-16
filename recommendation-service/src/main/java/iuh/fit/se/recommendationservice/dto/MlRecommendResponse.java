package iuh.fit.se.recommendationservice.dto;
import lombok.*;
import java.util.List;
@Data @NoArgsConstructor @AllArgsConstructor
public class MlRecommendResponse {
    private List<MlSongScore> recommendations;
    private String modelVersion;
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class MlSongScore {
        private String songId;
        private double score;
    }
}