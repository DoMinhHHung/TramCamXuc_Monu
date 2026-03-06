package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "hearts")
@CompoundIndexes({
        @CompoundIndex(name = "user_song_heart", def = "{'userId': 1, 'songId': 1}", unique = true),
        @CompoundIndex(name = "song_hearts", def = "{'songId': 1, 'createdAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Heart {
    @Id
    private String id;

    private UUID userId;
    private UUID songId;

    @CreatedDate
    private Instant createdAt;
}
