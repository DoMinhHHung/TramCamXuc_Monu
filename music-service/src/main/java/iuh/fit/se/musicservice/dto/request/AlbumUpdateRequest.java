package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumUpdateRequest {

    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    @Size(max = 1000)
    private String description;

    private LocalDate releaseDate;
}
