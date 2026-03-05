package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "albums", indexes = {
        @Index(name = "idx_albums_slug",   columnList = "slug",          unique = true),
        @Index(name = "idx_albums_owner",  columnList = "owner_artist_id"),
        @Index(name = "idx_albums_status", columnList = "status")
})
@Getter @Setter
@Builder @SuperBuilder
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_artist_id", nullable = false)
    private Artist ownerArtist;

    /** Thay thế AlbumApprovalStatus — không còn duyệt nữa */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlbumStatus status = AlbumStatus.PRIVATE;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AlbumSong> albumSongs = new ArrayList<>();
}
