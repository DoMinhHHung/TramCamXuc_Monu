package iuh.fit.se.musicservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mỗi AlbumSong là một NODE trong doubly linked list của album.
 *
 * Cấu trúc:
 *   Album.headSongId ──► [Node A] ⇄ [Node B] ⇄ [Node C]
 *                         prev=null                next=null
 *
 * Kéo [C] lên giữa [A] và [B]:
 *   Trước: A(null,B)  B(A,C)  C(B,null)
 *   Sau:   A(null,C)  C(A,B)  B(C,null)
 *   → Chỉ update 3 node, O(1) writes.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "album_songs",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_album_song", columnNames = {"album_id", "song_id"}),
        indexes = {
                @Index(name = "idx_album_songs_album", columnList = "album_id"),
                @Index(name = "idx_album_songs_song",  columnList = "song_id")
        })
public class AlbumSong {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;

    @Column(name = "song_id", nullable = false)
    private UUID songId;

    // ── Linked list pointers ───────────────────────────────────────────────
    @Column(name = "prev_id")
    private UUID prevId;

    @Column(name = "next_id")
    private UUID nextId;

    @Column(name = "added_at", nullable = false)
    @Builder.Default
    private LocalDateTime addedAt = LocalDateTime.now();
}
