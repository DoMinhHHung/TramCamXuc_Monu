package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Drag & drop payload — Trello-like.
 *
 * Frontend gửi ID của PlaylistSong (KHÔNG phải songId) đứng
 * trước và sau vị trí đích để backend tính lại linked list.
 *
 * Tại sao dùng playlistSongId thay vì songId?
 * → PlaylistSong.id là stable ID của node trong list.
 *   Cùng một song có thể xuất hiện ở nhiều playlist khác nhau.
 *
 * Ví dụ list: [Node-A] ⇄ [Node-B] ⇄ [Node-C]
 *
 *   Kéo C lên giữa A và B:
 *     draggedId   = Node-C.id
 *     prevId      = Node-A.id
 *     nextId      = Node-B.id
 *
 *   Kéo C lên đầu:
 *     draggedId   = Node-C.id
 *     prevId      = null
 *     nextId      = Node-A.id
 *
 *   Kéo A xuống cuối:
 *     draggedId   = Node-A.id
 *     prevId      = Node-C.id
 *     nextId      = null
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReorderRequest {

    @NotNull(message = "DRAGGED_ID_REQUIRED")
    private UUID draggedId;

    private UUID prevId;
    private UUID nextId;
}