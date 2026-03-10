package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents a user-follows-user relationship used for collaborative filtering
 * in the recommendation-service.
 */
@Document(collection = "user_follows")
@CompoundIndexes({
        @CompoundIndex(name = "follower_followee", def = "{'followerId': 1, 'followeeId': 1}", unique = true),
        @CompoundIndex(name = "followee_idx",      def = "{'followeeId': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFollow {
    @Id
    private String id;

    private UUID followerId;
    private UUID followeeId;

    @CreatedDate
    private Instant createdAt;
}

