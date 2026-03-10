package iuh.fit.se.socialservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.UUID;

@Data
public class CommentRequest {
    @NotNull(message = "songId is required")
    private UUID songId;

    private String parentId;   // null = top-level

    @NotBlank(message = "content must not be blank")
    @Size(min = 1, max = 1000, message = "content must be 1-1000 chars")
    private String content;
}
