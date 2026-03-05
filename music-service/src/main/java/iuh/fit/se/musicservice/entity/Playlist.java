package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.PlaylistVisibility;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter @Setter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "playlists", indexes = {
        @Index(name = "idx_playlists_owner", columnList = "user_id"),
        @Index(name = "idx_playlists_slug", columnList = "slug", unique = true)
})
public class Playlist extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 200)
    private String name;
    @Column(nullable = false, unique = true, length = 255)
    private String slug;
    @Column(length = 500)
    private String description;
    @Column(name = "cover_url", length = 500)
    private String coverUrl;
    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PlaylistVisibility visibility = PlaylistVisibility.PUBLIC;
    @Column(name = "head_song_id")
    private UUID headSongId;
    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PlaylistSong> songs = new ArrayList<>();
}
