package iuh.fit.se.socialservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class PostCommentRequest {
    @NotBlank
    private String postId;
    private String parentId;
    @NotBlank @Size(min = 1, max = 1000) private String content;
}