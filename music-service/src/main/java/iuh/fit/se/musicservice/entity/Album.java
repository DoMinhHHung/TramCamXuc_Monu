package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Album của nghệ sĩ.
 *
 * Album quản lý danh sách bài hát bằng doubly linked list (headSongId → AlbumSong.nextId).
 * → Drag-and-drop reorder chỉ cần update 3 node, O(1) writes.
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "albums", indexes = {
        @Index(name = "idx_albums_slug",       columnList = "slug",            unique = true),
        @Index(name = "idx_albums_owner",      columnList = "owner_artist_id"),
        @Index(name = "idx_albums_status",     columnList = "status")
})
public class Album extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
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

    /** Scheduled publish: status tự động chuyển PUBLIC tại thời điểm này */
    @Column(name = "scheduled_publish_at")
    private ZonedDateTime scheduledPublishAt;

    /** Owner – artist ID trong bảng artists */
    @Column(name = "owner_artist_id", nullable = false)
    private UUID ownerArtistId;

    /** Denormalized để tránh join khi render */
    @Column(name = "owner_stage_name", nullable = false, length = 100)
    private String ownerStageName;

    @Column(name = "owner_avatar_url", length = 500)
    private String ownerAvatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlbumStatus status = AlbumStatus.DRAFT;

    /** Pointer tới AlbumSong.id đầu tiên trong linked list */
    @Column(name = "head_song_id")
    private UUID headSongId;

    /** Tổng duration – tính lại mỗi khi add/remove song */
    @Column(name = "total_duration_seconds", nullable = false)
    @Builder.Default
    private Integer totalDurationSeconds = 0;
}
