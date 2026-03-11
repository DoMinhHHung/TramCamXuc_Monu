package iuh.fit.se.adsservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ghi lại mỗi lượt phát quảng cáo.
 * Dùng để phân tích chi tiết: theo giờ, theo ngày, theo user segment.
 */
@Entity
@Table(
    name = "ad_impressions",
    indexes = {
        @Index(name = "idx_imp_ad_id",  columnList = "ad_id"),
        @Index(name = "idx_imp_user",   columnList = "user_id"),
        @Index(name = "idx_imp_played", columnList = "played_at")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AdImpression {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ad_id", nullable = false)
    private UUID adId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Bài hát đang phát trước khi quảng cáo xuất hiện */
    @Column(name = "song_id")
    private UUID songId;

    /** User đã nghe hết ad chưa (true = nghe full) */
    @Column(name = "completed")
    @Builder.Default
    private Boolean completed = false;

    @CreatedDate
    @Column(name = "played_at", nullable = false, updatable = false)
    private LocalDateTime playedAt;
}
