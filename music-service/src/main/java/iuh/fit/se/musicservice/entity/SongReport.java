package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.ReportReason;
import iuh.fit.se.musicservice.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;


@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "song_reports", indexes = {
        @Index(name = "idx_reports_song",     columnList = "song_id"),
        @Index(name = "idx_reports_reporter", columnList = "reporter_id"),
        @Index(name = "idx_reports_status",   columnList = "status")
})
public class SongReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "song_id", nullable = false)
    private UUID songId;

    @Column(name = "reporter_id")
    private UUID reporterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(name = "description", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "admin_note", length = 500)
    private String adminNote;
}