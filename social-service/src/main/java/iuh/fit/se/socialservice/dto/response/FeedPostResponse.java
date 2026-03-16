package iuh.fit.se.socialservice.dto.response;

import iuh.fit.se.socialservice.document.FeedPost;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor
@AllArgsConstructor
public class FeedPostResponse {
    private String               id;
    private UUID                 ownerId;
    private String               ownerType;
    private FeedPost.ContentType contentType;
    private UUID contentId;
    private String               title;
    private String               caption;
    private String               coverImageUrl;
    private FeedPost.Visibility  visibility;
    private long                 likeCount;
    private long                 commentCount;
    private long                 shareCount;
    private boolean              likedByCurrentUser;
    private Instant createdAt;
}