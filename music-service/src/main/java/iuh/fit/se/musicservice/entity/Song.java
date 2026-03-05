package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "songs", indexes = {
        @Index(name = "idx_songs_slug",             columnList = "slug",             unique = true),
        @Index(name = "idx_songs_status",           columnList = "status"),
        @Index(name = "idx_songs_transcode_status", columnList = "transcode_status"),
        @Index(name = "idx_songs_primary_artist",   columnList = "primary_artist_id"),
        @Index(name = "idx_songs_deleted",          columnList = "deleted_at")
})
public class Song extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "primary_artist_id", nullable = false)
    private UUID primaryArtistId;

    @Column(name = "primary_artist_stage_name", nullable = false, length = 100)
    private String primaryArtistStageName;

    @Column(name = "primary_artist_avatar_url", length = 500)
    private String primaryArtistAvatarUrl;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "song_genres",
            joinColumns = @JoinColumn(name = "song_id"),
            inverseJoinColumns = @JoinColumn(name = "genre_id")
    )
    private Set<Genre> genres;

    @Column(name = "raw_file_key", length = 500)
    private String rawFileKey;

    @Column(name = "hls_master_url", length = 500)
    private String hlsMasterUrl;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "lyric_url", length = 500)
    private String lyricUrl;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SongStatus status = SongStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "transcode_status", nullable = false)
    @Builder.Default
    private TranscodeStatus transcodeStatus = TranscodeStatus.PENDING;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private UUID deletedBy;

    @Column(name = "delete_reason", length = 1000)
    private String deleteReason;

    @Column(name = "play_count", nullable = false)
    @Builder.Default
    private Long playCount = 0L;

    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isPubliclyAvailable() {
        return status == SongStatus.PUBLIC
                && transcodeStatus == TranscodeStatus.COMPLETED
                && deletedAt == null;
    }
}