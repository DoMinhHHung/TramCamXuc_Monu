package iuh.fit.se.recommendationservice.dto;
import lombok.*;
import java.util.UUID;
@Data @NoArgsConstructor @AllArgsConstructor
public class FeedbackRequest {
    private UUID songId;
    private FeedbackType type;
    private String sessionId;
    public enum FeedbackType {
        SKIP,
        /** Bỏ qua trong 10 giây đầu — negative signal mạnh hơn SKIP */
        SKIP_EARLY,
        /** Nghe lại ngay lập tức — super like */
        REPEAT,
        REPLAY,
        ADD_PLAYLIST,
        SHARE,
        DISLIKE
    }
}