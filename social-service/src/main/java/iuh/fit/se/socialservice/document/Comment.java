package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "comments")
@CompoundIndexes({
        @CompoundIndex(name = "song_comments", def = "{'songId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "parent_replies", def = "{'parentId': 1, 'createdAt': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {
    @Id
    private String id;

    private UUID userId;
    private UUID songId;
    private String postId;

    @Indexed
    private String parentId;

    private String content;
    private int likeCount;
    private boolean edited;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
