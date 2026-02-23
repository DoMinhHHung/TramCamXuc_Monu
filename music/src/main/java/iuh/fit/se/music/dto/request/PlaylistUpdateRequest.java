package iuh.fit.se.music.dto.request;

import iuh.fit.se.music.enums.PlaylistVisibility;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistUpdateRequest {

    @Size(max = 200, message = "PLAYLIST_NAME_TOO_LONG")
    private String name;

    @Size(max = 500, message = "PLAYLIST_DESCRIPTION_TOO_LONG")
    private String description;

    private PlaylistVisibility visibility;
}