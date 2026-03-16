package iuh.fit.se.recommendationservice.dto;
import lombok.*;
import java.util.UUID;
@Data @NoArgsConstructor @AllArgsConstructor
public class FeedbackRequest {
    private UUID songId;
    private FeedbackType type;
    private String sessionId;
    public enum FeedbackType {
        SKIP, REPLAY, ADD_PLAYLIST, SHARE, DISLIKE
    }
}