package iuh.fit.se.socialservice.dto.request;

import iuh.fit.se.socialservice.document.FeedPost;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.UUID;

@Data
public class FeedPostRequest {

    @NotNull(message = "visibility is required")
    private FeedPost.Visibility visibility;

    @Size(max = 2000)
    private String caption;

    // Optional — nếu share nội dung từ music-service
    private UUID contentId;
    private FeedPost.ContentType contentType;   // SONG | ALBUM | PLAYLIST
    private String               title;
    private String               coverImageUrl;
}