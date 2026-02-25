package iuh.fit.se.social.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Document(collection = "comment_likes")
@CompoundIndexes({
        @CompoundIndex(name = "idx_comment_like_user",
                def = "{'userId': 1, 'commentId': 1}", unique = true),
        @CompoundIndex(name = "idx_comment_like_comment",
                def = "{'commentId': 1}")
})
public class CommentLike {
    @Id
    private String id;
    private UUID userId;
    private String commentId;
    @CreatedDate
    private LocalDateTime createdAt;
}