package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "comment_likes")
@CompoundIndexes({
        @CompoundIndex(name = "user_comment_like", def = "{'userId': 1, 'commentId': 1}", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentLike {
    @Id
    private String id;

    private UUID userId;
    private String commentId;

    @CreatedDate
    private Instant createdAt;
}
