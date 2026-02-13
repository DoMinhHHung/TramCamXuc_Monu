package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArtistRegisterRequest {

    @NotBlank(message = "STAGE_NAME_REQUIRED")
    @Size(min = 2, max = 100, message = "STAGE_NAME_INVALID_LENGTH")
    private String stageName;

    @Size(max = 1000, message = "BIO_TOO_LONG")
    private String bio;

    private String avatarUrl;
}