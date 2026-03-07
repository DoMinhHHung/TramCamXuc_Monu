package iuh.fit.se.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlRecommendationResponse {
    private List<String> songIds;
    private String strategy;
    private String reason;
}