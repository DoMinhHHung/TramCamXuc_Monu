package iuh.fit.se.socialservice.dto.message;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FeedContentEvent {

    public enum ContentType { ALBUM }
    public enum Visibility  { PUBLIC }

    private UUID        contentId;
    private ContentType contentType;
    private UUID        artistId;
    private String      title;
    private String      coverImageUrl;
    private Visibility  visibility;
    private Instant     publishedAt;
}