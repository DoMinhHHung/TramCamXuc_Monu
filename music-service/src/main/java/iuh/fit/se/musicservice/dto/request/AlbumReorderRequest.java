package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Drag & drop payload — Trello-style.
 *
 * Frontend gửi AlbumSong.id (KHÔNG phải songId) của node đứng
 * trước và sau vị trí đích để backend tính lại linked list.
 *
 * Ví dụ list: [A] ⇄ [B] ⇄ [C]
 *
 *   Kéo [C] lên giữa [A] và [B]:
 *     draggedId = C.id
 *     prevId    = A.id
 *     nextId    = B.id
 *
 *   Kéo [C] lên đầu:
 *     draggedId = C.id
 *     prevId    = null
 *     nextId    = A.id
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumReorderRequest {

    @NotNull(message = "DRAGGED_ID_REQUIRED")
    private UUID draggedId;

    /** null = kéo lên đầu */
    private UUID prevId;

    /** null = kéo xuống cuối */
    private UUID nextId;
}
