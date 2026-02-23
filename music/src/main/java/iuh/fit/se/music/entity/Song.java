package iuh.fit.se.music.entity;

import iuh.fit.se.core.entity.BaseEntity;
import iuh.fit.se.music.enums.ApprovalStatus;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.enums.TranscodeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "songs", indexes = {
        @Index(name = "idx_songs_slug", columnList = "slug", unique = true),
        @Index(name = "idx_songs_status", columnList = "status"),
        @Index(name = "idx_songs_approval_status", columnList = "approval_status"),
        @Index(name = "idx_songs_transcode_status", columnList = "transcode_status")
})
public class Song extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_artist_id", nullable = false)
    private Artist primaryArtist;

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
    private SongStatus status = SongStatus.PUBLIC;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    @Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "transcode_status", nullable = false)
    @Builder.Default
    private TranscodeStatus transcodeStatus = TranscodeStatus.PENDING;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "play_count", nullable = false)
    @Builder.Default
    private Long playCount = 0L;
}