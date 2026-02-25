package iuh.fit.se.social.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentRequest {

    @NotBlank(message = "Comment content must not be blank")
    @Size(max = 1000, message = "Comment must not exceed 1000 characters")
    private String content;

    private String parentId;
}