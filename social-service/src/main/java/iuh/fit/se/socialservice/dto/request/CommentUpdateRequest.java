package iuh.fit.se.socialservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommentUpdateRequest {
    @NotBlank(message = "content must not be blank")
    @Size(min = 1, max = 1000, message = "content must be 1-1000 chars")
    private String content;
}
