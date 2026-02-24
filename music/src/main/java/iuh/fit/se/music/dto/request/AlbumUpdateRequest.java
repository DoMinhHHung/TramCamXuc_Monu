package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlbumUpdateRequest {

    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    @Size(max = 1000, message = "DESCRIPTION_TOO_LONG")
    private String description;

    private LocalDate releaseDate;
}