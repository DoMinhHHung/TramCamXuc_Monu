package iuh.fit.se.musicservice.dto.request;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.ZonedDateTime;

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

    @Size(max = 500, message = "COVER_URL_TOO_LONG")
    private String coverUrl;

    private LocalDate releaseDate;
    private ZonedDateTime scheduledPublishAt;
    private AlbumStatus status;
}
