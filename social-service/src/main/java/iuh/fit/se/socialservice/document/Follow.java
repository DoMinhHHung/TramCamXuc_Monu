package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "follows")
@CompoundIndexes({
        @CompoundIndex(name = "follower_artist", def = "{'followerId': 1, 'artistId': 1}", unique = true),
        @CompoundIndex(name = "artist_followers", def = "{'artistId': 1, 'createdAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Follow {
    @Id
    private String id;

    private UUID followerId;
    private UUID artistId;

    @CreatedDate
    private Instant createdAt;
}
