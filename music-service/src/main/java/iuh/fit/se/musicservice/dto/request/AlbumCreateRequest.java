package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumCreateRequest {

    @NotBlank(message = "TITLE_REQUIRED")
    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    @Size(max = 1000)
    private String description;

    @Pattern(regexp = "^(?i)(jpg|jpeg|png|webp)$", message = "INVALID_FILE_EXTENSION")
    private String coverFileExtension;

    private LocalDate releaseDate;
}
