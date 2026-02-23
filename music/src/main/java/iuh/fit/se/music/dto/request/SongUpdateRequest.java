package iuh.fit.se.music.dto.request;

import iuh.fit.se.music.enums.SongStatus;
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

    // Artist chỉ được đổi PUBLIC ↔ PRIVATE hoặc → DELETED
    // Không được đổi về DRAFT sau khi đã submit
    private SongStatus status;
}