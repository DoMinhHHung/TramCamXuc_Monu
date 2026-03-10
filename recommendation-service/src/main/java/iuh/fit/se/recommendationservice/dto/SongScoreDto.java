package iuh.fit.se.recommendationservice.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongScoreDto {
    private SongDto song;
    private double score;
    private String reason;
}