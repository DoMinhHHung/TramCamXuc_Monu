package iuh.fit.se.social.document;

import iuh.fit.se.social.enums.TargetType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "comments")
@CompoundIndexes({
        @CompoundIndex(name = "idx_comment_target", def = "{'targetId': 1, 'targetType': 1}"),
        @CompoundIndex(name = "idx_comment_parent", def = "{'parentId': 1}")
})
public class Comment {

    @Id
    private String id;

    private UUID userId;
    private String userFullName;
    private String userAvatarUrl;

    private UUID targetId;
    private TargetType targetType;

    private String content;
    private String parentId;

    @Builder.Default
    private boolean deleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime editedAt;

    @Builder.Default
    private long likeCount = 0;
}