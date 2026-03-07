package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "listen_history")
@CompoundIndexes({
        @CompoundIndex(name = "idx_listen_user_listenedAt", def = "{'userId': 1, 'listenedAt': -1}"),
        @CompoundIndex(name = "idx_listen_song_user", def = "{'songId': 1, 'userId': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenHistory {
    @Id
    private String id;

    private Instant listenedAt;

    private UUID songId;
    private UUID artistId;
    private UUID userId;
    private UUID playlistId;
    private UUID albumId;
    private int durationSeconds;
}
