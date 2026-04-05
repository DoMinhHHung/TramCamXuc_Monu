package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "feed_posts")
@CompoundIndexes({
        @CompoundIndex(name = "owner_time",
                def = "{'ownerId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "content_unique",
                def = "{'contentId': 1, 'contentType': 1, 'ownerId': 1}",
                sparse = true)   // sparse vì TEXT post không có contentId
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FeedPost {

    public enum ContentType { SONG, ALBUM, PLAYLIST, TEXT }
    public enum Visibility  { PUBLIC, FOLLOWERS_ONLY, PRIVATE }

    @Id
    private String id;

    private UUID   ownerId;
    private String ownerType;

    private ContentType contentType;
    private UUID        contentId;

    private String title;
    private String caption;
    private String coverImageUrl;

    private Visibility visibility;

    private long likeCount;
    private long commentCount;
    private long shareCount;

    @CreatedDate    private Instant createdAt;
    @LastModifiedDate private Instant updatedAt;
}