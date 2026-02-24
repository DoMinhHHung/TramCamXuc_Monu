package iuh.fit.se.music.entity;

import iuh.fit.se.core.entity.BaseEntity;
import iuh.fit.se.music.enums.AlbumApprovalStatus;
import iuh.fit.se.music.enums.AlbumVisibility;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "albums", indexes = {
        @Index(name = "idx_albums_slug",            columnList = "slug",            unique = true),
        @Index(name = "idx_albums_owner",           columnList = "owner_artist_id"),
        @Index(name = "idx_albums_approval_status", columnList = "approval_status"),
        @Index(name = "idx_albums_visibility",      columnList = "visibility")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    // Tính lại mỗi khi add/remove song
    @Column(name = "total_duration_seconds", nullable = false)
    @Builder.Default
    private Integer totalDurationSeconds = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_artist_id", nullable = false)
    private Artist ownerArtist;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    @Builder.Default
    private AlbumApprovalStatus approvalStatus = AlbumApprovalStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlbumVisibility visibility = AlbumVisibility.PRIVATE;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AlbumSong> albumSongs = new ArrayList<>();

}