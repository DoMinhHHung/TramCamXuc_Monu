package iuh.fit.se.socialservice.dto.response;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private String id;
    private UUID userId;
    private UUID songId;
    private String parentId;
    private String content;
    private int likeCount;
    private boolean edited;
    private boolean likedByCurrentUser;
    private long replyCount;
    private Instant createdAt;
    private Instant updatedAt;
}
