package iuh.fit.se.recommendationservice.dto;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor
public class ListenHistoryItemDto {
    private String songId;
    private String artistId;
    private int durationSeconds;
    private String listenedAt;
}