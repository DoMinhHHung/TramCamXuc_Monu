package iuh.fit.se.musicservice.dto.request;

import iuh.fit.se.musicservice.enums.Genre;
import iuh.fit.se.musicservice.enums.SongStatus;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Set;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SongUpdateRequest {
    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    private Set<Genre> genres;

    private SongStatus status;
}