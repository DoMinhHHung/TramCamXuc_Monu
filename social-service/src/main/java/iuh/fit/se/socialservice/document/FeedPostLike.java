package iuh.fit.se.socialservice.document;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "feed_post_likes")
@CompoundIndexes({
        @CompoundIndex(name = "user_post_like",
                def = "{'userId': 1, 'postId': 1}", unique = true)
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FeedPostLike {
    @Id private String id;
    private UUID   userId;
    private String postId;
    @CreatedDate private Instant createdAt;
}