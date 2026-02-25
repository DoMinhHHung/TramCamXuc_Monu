package iuh.fit.se.social.document;

import iuh.fit.se.social.enums.ReactionType;
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
@Document(collection = "reactions")
@CompoundIndexes({
        @CompoundIndex(name = "idx_reaction_user_target",
                def = "{'userId': 1, 'targetId': 1, 'targetType': 1}", unique = true),
        @CompoundIndex(name = "idx_reaction_target",
                def = "{'targetId': 1, 'targetType': 1}")
})
public class Reaction {

    @Id
    private String id;

    private UUID userId;
    private UUID targetId;
    private TargetType targetType;
    private ReactionType reactionType;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}