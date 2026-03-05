package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Album entity - Decoupled from identity-service.
 * Uses loose reference (ownerArtistId) instead of JPA association.
 */
@Entity
@Table(name = "albums", indexes = {
        @Index(name = "idx_albums_slug",   columnList = "slug",          unique = true),
        @Index(name = "idx_albums_owner",  columnList = "owner_artist_id"),
        @Index(name = "idx_albums_status", columnList = "status")
})
@Getter @Setter
@SuperBuilder
@NoArgsConstructor @AllArgsConstructor
public class Album extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(length = 1000)
    private String description;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "scheduled_publish_at")
    private ZonedDateTime scheduledPublishAt;

    @Column(name = "total_duration_seconds", nullable = false)
    @Builder.Default
    private Integer totalDurationSeconds = 0;

    /**
     * Loose reference to Artist from identity-service.
     * No JPA @ManyToOne - respects "Database per Service" pattern.
     * TODO: Fetch Artist info via FeignClient or CQRS Event
     */
    @Column(name = "owner_artist_id", nullable = false, length = 36)
    private String ownerArtistId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlbumStatus status = AlbumStatus.DRAFT;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AlbumSong> albumSongs = new ArrayList<>();

    /**
     * Timestamp when the album was soft-deleted
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Admin ID who deleted the album (for audit trail)
     */
    @Column(name = "deleted_by", length = 36)
    private String deletedBy;
}