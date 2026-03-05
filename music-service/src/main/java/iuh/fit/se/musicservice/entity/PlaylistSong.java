package iuh.fit.se.musicservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(
        name = "playlist_songs",
        uniqueConstraints = @UniqueConstraint(name = "uq_playlist_song", columnNames = {"playlist_id", "song_id"}),
        indexes = {
                @Index(name = "idx_pls_playlist", columnList = "playlist_id"),
                @Index(name = "idx_pls_song", columnList = "song_id")
        }
)

public class PlaylistSong {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
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