package iuh.fit.se.paymentservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "user_ai_music_usage",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "period_ym"})
)
@EntityListeners(AuditingEntityListener.class)
public class UserAiMusicUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * Chu kỳ thống kê: yyyy-MM (theo Asia/Ho_Chi_Minh khi music-service gửi lên).
     */
    @Column(name = "period_ym", nullable = false, length = 7)
    private String periodYm;

    @Column(name = "generation_count", nullable = false)
    @Builder.Default
    private int generationCount = 0;

    @Column(name = "total_duration_seconds", nullable = false)
    @Builder.Default
    private int totalDurationSeconds = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
