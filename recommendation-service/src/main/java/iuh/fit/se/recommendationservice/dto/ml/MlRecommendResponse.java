package iuh.fit.se.recommendationservice.dto.ml;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlRecommendResponse {

    private String userId;
    private List<MlScoredSong> songs;
    private String strategy;
    private double computeTimeMs;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MlScoredSong {
        private String songId;
        private double score;
        private String reason;
    }
}