package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.PlaylistVisibility;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Playlist entity - Decoupled from identity-service.
 * Uses loose reference (ownerId) instead of JPA association to User.
 */
@Getter @Setter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "playlists", indexes = {
        @Index(name = "idx_playlists_owner", columnList = "owner_id"),
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

    /**
     * Loose reference to User from identity-service.
     * No JPA @ManyToOne - respects "Database per Service" pattern.
     * TODO: Fetch User info via FeignClient or CQRS Event
     */
    @Column(name = "owner_id", nullable = false, length = 36)
    private String ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PlaylistVisibility visibility = PlaylistVisibility.PUBLIC;

    /** Head of doubly linked list for ordered songs */
    @Column(name = "head_song_id")
    private UUID headSongId;

    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PlaylistSong> songs = new ArrayList<>();
}