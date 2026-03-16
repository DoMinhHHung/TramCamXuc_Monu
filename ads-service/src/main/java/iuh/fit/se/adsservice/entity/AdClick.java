package iuh.fit.se.adsservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ghi lại mỗi lượt user click vào quảng cáo.
 */
@Entity
@Table(
    name = "ad_clicks",
    indexes = {
        @Index(name = "idx_click_ad_id",  columnList = "ad_id"),
        @Index(name = "idx_click_user",   columnList = "user_id"),
        @Index(name = "idx_click_time",   columnList = "clicked_at")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AdClick {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ad_id", nullable = false)
    private UUID adId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @CreatedDate
    @Column(name = "clicked_at", nullable = false, updatable = false)
    private LocalDateTime clickedAt;
}
