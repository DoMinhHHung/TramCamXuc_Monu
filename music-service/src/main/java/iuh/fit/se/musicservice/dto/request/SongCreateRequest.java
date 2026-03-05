package iuh.fit.se.musicservice.dto.request;

import iuh.fit.se.musicservice.enums.Genre;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.Set;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SongCreateRequest {

    @NotBlank(message = "TITLE_REQUIRED")
    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    @Pattern(regexp = "^(?i)(mp3|wav|flac|aac|ogg|m4a)$", message = "INVALID_FILE_EXTENSION")
    private String fileExtension;

    @NotEmpty(message = "GENRES_REQUIRED")
    private Set<Genre> genres;
}