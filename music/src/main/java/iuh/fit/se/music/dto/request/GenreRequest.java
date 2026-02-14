package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenreRequest {

    @NotBlank(message = "GENRE_NAME_REQUIRED")
    @Size(max = 100, message = "GENRE_NAME_TOO_LONG")
    private String name;

    @Size(max = 500, message = "DESCRIPTION_TOO_LONG")
    private String description;
}