package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.Genre;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Song entity - Decoupled from identity-service.
 * Uses loose reference (artistId) instead of JPA association.
 */
@Getter @Setter
@SuperBuilder
@NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "songs", indexes = {
        @Index(name = "idx_songs_slug",            columnList = "slug",            unique = true),
        @Index(name = "idx_songs_status",          columnList = "status"),
        @Index(name = "idx_songs_transcode_status",columnList = "transcode_status"),
        @Index(name = "idx_songs_artist",          columnList = "artist_id")
})
public class Song extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    /**
     * Loose reference to Artist from identity-service.
     * No JPA @ManyToOne - respects "Database per Service" pattern.
     * TODO: Fetch Artist info via FeignClient or CQRS Event
     */
    @Column(name = "artist_id", nullable = false, length = 36)
    private String artistId;

    @ElementCollection(targetClass = Genre.class, fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "song_genres",
            joinColumns = @JoinColumn(name = "song_id"))
    @Column(name = "genre", nullable = false)
    private Set<Genre> genres;

    @Column(name = "raw_file_key", length = 500)
    private String rawFileKey;

    @Column(name = "hls_master_url", length = 500)
    private String hlsMasterUrl;

    /**
     * HLS folder key in MinIO (e.g., "hls/{songId}/")
     */
    @Column(name = "hls_folder_key", length = 500)
    private String hlsFolderKey;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "lyric_url", length = 500)
    private String lyricUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SongStatus status = SongStatus.PROCESSING;

    @Enumerated(EnumType.STRING)
    @Column(name = "transcode_status", nullable = false)
    @Builder.Default
    private TranscodeStatus transcodeStatus = TranscodeStatus.PENDING;

    @Column(name = "play_count", nullable = false)
    @Builder.Default
    private Long playCount = 0L;

    /**
     * Timestamp when the song was soft-deleted
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Admin ID who deleted the song (for audit trail)
     */
    @Column(name = "deleted_by", length = 36)
    private String deletedBy;
}