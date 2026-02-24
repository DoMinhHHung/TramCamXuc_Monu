package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlbumCreateRequest {

    @NotBlank(message = "TITLE_REQUIRED")
    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    @Size(max = 1000, message = "DESCRIPTION_TOO_LONG")
    private String description;

    private LocalDate releaseDate;
}