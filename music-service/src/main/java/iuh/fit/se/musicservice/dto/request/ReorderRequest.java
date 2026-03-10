package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Drag & drop payload — Trello-like linked list reorder.
 *
 * Gửi ID của PlaylistSong node đứng trước và sau vị trí đích.
 * Backend chỉ cần update 3-5 con trỏ — O(1) writes.
 *
 * Ví dụ list: [Node-A] ⇄ [Node-B] ⇄ [Node-C]
 *
 *   Kéo C lên giữa A và B:
 *     draggedId = Node-C.id
 *     prevId    = Node-A.id
 *     nextId    = Node-B.id
 *
 *   Kéo C lên đầu:
 *     draggedId = Node-C.id
 *     prevId    = null
 *     nextId    = Node-A.id
 *
 *   Kéo A xuống cuối:
 *     draggedId = Node-A.id
 *     prevId    = Node-C.id
 *     nextId    = null
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReorderRequest {

    @NotNull(message = "DRAGGED_ID_REQUIRED")
    private UUID draggedId;

    /** null → kéo lên đầu danh sách */
    private UUID prevId;

    /** null → kéo xuống cuối danh sách */
    private UUID nextId;
}
