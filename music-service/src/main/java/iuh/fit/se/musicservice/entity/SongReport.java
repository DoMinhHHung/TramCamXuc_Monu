package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.ReportReason;
import iuh.fit.se.musicservice.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Người dùng báo cáo bài hát vi phạm.
 *
 * Luồng:
 *   User gửi report → status = PENDING
 *   Admin xem xét:
 *     - Xác nhận vi phạm → status = CONFIRMED → soft-delete song
 *     - Bác bỏ           → status = DISMISSED
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "song_reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_song_report_user_song", columnNames = {"reporter_id", "song_id"})
        },
        indexes = {
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

    /** userId người báo cáo; null nếu khách vãng lai */
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

    /** Admin duyệt/bác bỏ */
    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /** Ghi chú của admin khi xử lý */
    @Column(name = "admin_note", length = 500)
    private String adminNote;
}
