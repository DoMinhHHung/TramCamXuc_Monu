package iuh.fit.se.social.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditCommentRequest {
    @NotBlank
    @Size(max = 1000)
    private String content;
}