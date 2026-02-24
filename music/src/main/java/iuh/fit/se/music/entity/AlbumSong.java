package iuh.fit.se.music.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "album_songs",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_album_song",
                columnNames = {"album_id", "song_id"}
        ),
        indexes = {
                @Index(name = "idx_album_songs_album", columnList = "album_id"),
                @Index(name = "idx_album_songs_song",  columnList = "song_id"),
                @Index(name = "idx_album_songs_order", columnList = "album_id, order_index")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlbumSong {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id", nullable = false)
    private Album album;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "added_at", nullable = false)
    @Builder.Default
    private LocalDateTime addedAt = LocalDateTime.now();
}