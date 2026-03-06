package iuh.fit.se.socialservice.document;

import iuh.fit.se.socialservice.enums.ReactionType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "reactions")
@CompoundIndexes({
        @CompoundIndex(name = "user_song_reaction", def = "{'userId': 1, 'songId': 1}", unique = true),
        @CompoundIndex(name = "song_reactions", def = "{'songId': 1, 'type': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reaction {
    @Id
    private String id;

    private UUID userId;
    private UUID songId;
    private ReactionType type;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
