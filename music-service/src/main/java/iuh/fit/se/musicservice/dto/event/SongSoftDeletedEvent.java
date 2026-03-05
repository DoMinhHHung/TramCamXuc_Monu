package iuh.fit.se.musicservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event published to RabbitMQ when a song is soft-deleted by admin.
 * Other microservices (e.g., social-service) can listen to update their documents.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongSoftDeletedEvent implements Serializable {
    
    private static final long serialVersionUID = 1L;

    /**
     * The ID of the deleted song
     */
    private UUID songId;

    /**
     * The ID of the artist who owned the song
     */
    private String artistId;

    /**
     * The ID of the admin who performed the deletion
     */
    private String adminId;

    /**
     * Timestamp when the song was deleted
     */
    private LocalDateTime deletedAt;

    /**
     * Reason for deletion (e.g., "Reported by users", "Copyright violation")
     */
    private String reason;
}
