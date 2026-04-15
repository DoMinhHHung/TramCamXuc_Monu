package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.SourceType;
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
        @Index(name = "idx_songs_deleted",          columnList = "deleted_at"),
        @Index(name = "idx_songs_jamendo", columnList = "jamendo_id")
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

    // ── Genres ────────────────────────────────────────────────────────────────
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "song_genres",
            joinColumns = @JoinColumn(name = "song_id"),
            inverseJoinColumns = @JoinColumn(name = "genre_id")
    )
    private Set<Genre> genres;

    @Column(name = "raw_file_key", length = 500)
    private String rawFileKey;

    @Column(name = "cover_file_key", length = 500)
    private String coverFileKey;

    @Column(name = "hls_master_url", length = 500)
    private String hlsMasterUrl;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "lyric_url", length = 500)
    private String lyricUrl;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "waveform_url", length = 500)
    private String waveformUrl;

    // ── Status ────────────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SongStatus status = SongStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "transcode_status", nullable = false)
    @Builder.Default
    private TranscodeStatus transcodeStatus = TranscodeStatus.PENDING;

    // ── Soft delete ────────────────────────────────────────────────────────────
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private UUID deletedBy;

    @Column(name = "delete_reason", length = 1000)
    private String deleteReason;

    // ── Stats ────────────────────────────────────────────────────────────────
    @Column(name = "play_count", nullable = false)
    @Builder.Default
    private Long playCount = 0L;

    // ── Ownership ─────────────────────────────────────────────────────────────
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Column(name = "jamendo_id", unique = true)
    private String jamendoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    @Builder.Default
    private SourceType sourceType = SourceType.LOCAL;

    @Column(name = "ai_job_id")
    private UUID aiJobId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_visibility_target")
    private SongStatus aiVisibilityTarget;

    @Column(name = "soundcloud_id", unique = true)
    private String soundcloudId;

    @Column(name = "soundcloud_permalink", length = 500)
    private String soundcloudPermalink;

    @Column(name = "soundcloud_waveform_url", length = 500)
    private String soundcloudWaveformUrl;

    @Column(name = "soundcloud_username", length = 200)
    private String soundcloudUsername;

    // ── Helpers ───────────────────────────────────────────────────────────────
    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isPubliclyAvailable() {
        return status == SongStatus.PUBLIC
                && transcodeStatus == TranscodeStatus.COMPLETED
                && deletedAt == null;
    }
}
