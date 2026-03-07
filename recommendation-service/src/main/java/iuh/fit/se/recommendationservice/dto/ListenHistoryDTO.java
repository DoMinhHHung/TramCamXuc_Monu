package iuh.fit.se.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenHistoryDTO {
    private String songId;
    private String songTitle;
    private String artistId;
    private Long   listenedAt;
    private Integer durationSeconds;
    private Integer songDuration;
}