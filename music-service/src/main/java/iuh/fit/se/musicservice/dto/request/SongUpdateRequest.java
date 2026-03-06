package iuh.fit.se.musicservice.dto.request;

import iuh.fit.se.musicservice.enums.SongStatus;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongUpdateRequest {

    @Size(max = 200, message = "TITLE_TOO_LONG")
    private String title;

    private Set<UUID> genreIds;

    /**
     * Artist chỉ được đổi PUBLIC ↔ PRIVATE.
     * DRAFT và DELETED không thể set thủ công.
     */
    private SongStatus status;
}
