package iuh.fit.se.musicservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongSoftDeletedEvent {
    private UUID songId;
    private String adminId;
    private LocalDateTime deletedAt;
}
