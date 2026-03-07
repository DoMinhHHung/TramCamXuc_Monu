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
public class MlRecommendationRequest {
    private String userId;
    private String songId;
    private Integer limit;
    private List<String> excludeSongIds;
}