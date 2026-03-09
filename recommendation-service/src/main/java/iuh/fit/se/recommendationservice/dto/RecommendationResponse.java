package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponse {
    private List<SongScoreDto> songs;
    private String strategy;
    private boolean mlUsed;
    private long computeTimeMs;
}