package iuh.fit.se.music.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mỗi PlaylistSong là một NODE trong doubly linked list của playlist.
 *
 * Cấu trúc:
 *   Playlist.headSongId ──► [Node A] ⇄ [Node B] ⇄ [Node C]
 *                           prev=null              next=null
 *
 * Khi kéo thả [C] lên trước [B]:
 *   Trước: HEAD=A  A(prev=null,next=B)  B(prev=A,next=C)  C(prev=B,next=null)
 *   Sau:   HEAD=A  A(prev=null,next=C)  C(prev=A,next=B)  B(prev=C,next=null)
 *   → Chỉ update 3 node. O(1) writes.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "playlist_songs",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_playlist_song",
                columnNames = {"playlist_id", "song_id"}
        ),
        indexes = {
                @Index(name = "idx_pls_playlist", columnList = "playlist_id"),
                @Index(name = "idx_pls_song",     columnList = "song_id")
        }
)
public class PlaylistSong {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private Playlist playlist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Column(name = "prev_id")
    private UUID prevId;

    @Column(name = "next_id")
    private UUID nextId;

    @Column(name = "added_at", nullable = false)
    @Builder.Default
    private LocalDateTime addedAt = LocalDateTime.now();
}