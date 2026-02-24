package iuh.fit.se.music.dto.request;

import iuh.fit.se.music.enums.SongStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongCreateRequest {

    @NotBlank(message = "TITLE_REQUIRED")
    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    @Pattern(regexp = "^(?i)(mp3|wav|flac|aac|ogg|m4a)$", message = "INVALID_FILE_EXTENSION")
    private String fileExtension;

    @NotEmpty(message = "GENRES_REQUIRED")
    private Set<UUID> genreIds;
}