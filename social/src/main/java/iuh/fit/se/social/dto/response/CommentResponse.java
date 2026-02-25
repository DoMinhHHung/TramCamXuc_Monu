package iuh.fit.se.social.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private String id;
    private UUID userId;
    private String userFullName;
    private String userAvatarUrl;
    private String content;
    private String parentId;
    private boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CommentResponse> replies;
    private LocalDateTime editedAt;

    private long likeCount;
    private boolean likedByMe;
}