package iuh.fit.se.adsservice.entity;

import iuh.fit.se.adsservice.enums.AdStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Một mẩu quảng cáo do admin upload lên thay mặt nhãn hàng.
 *
 * Pricing model: CPM (cost per mille = giá / 1000 lượt phát).
 * Revenue = (totalImpressions / 1000) * cpmVnd
 */
@Entity
@Table(
    name = "ads",
    indexes = {
        @Index(name = "idx_ads_status", columnList = "status"),
        @Index(name = "idx_ads_advertiser", columnList = "advertiser_name")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Ad {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Tên nhãn hàng / advertiser (Grab, Shopee, ...) */
    @Column(name = "advertiser_name", nullable = false, length = 200)
    private String advertiserName;

    /** Tiêu đề hiển thị trên UI */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

    /** Đường dẫn khi user click vào quảng cáo */
    @Column(name = "target_url", nullable = false, length = 2000)
    private String targetUrl;

    /** MinIO object key của file MP3 quảng cáo (vd: ads/uuid/ad.mp3) */
    @Column(name = "audio_file_key", nullable = false, length = 500)
    private String audioFileKey;

    /** Thời lượng (giây) — đọc từ ffprobe hoặc do admin nhập */
    @Column(name = "duration_seconds")
    @Builder.Default
    private Integer durationSeconds = 0;

    /** Trạng thái: ACTIVE, PAUSED, ARCHIVED */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private AdStatus status = AdStatus.ACTIVE;

    /** Giá CPM (VNĐ / 1000 lượt phát) */
    @Column(name = "cpm_vnd", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal cpmVnd = BigDecimal.ZERO;

    /** Ngân sách tối đa (VNĐ) — service tự PAUSE khi vượt budget */
    @Column(name = "budget_vnd", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal budgetVnd = BigDecimal.ZERO;

    /** Ngày bắt đầu chạy quảng cáo */
    @Column(name = "start_date")
    private LocalDate startDate;

    /** Ngày kết thúc chạy quảng cáo (null = không giới hạn) */
    @Column(name = "end_date")
    private LocalDate endDate;

    /** Tổng số lượt phát (impressions) — tăng atomic khi /played */
    @Column(name = "total_impressions", nullable = false)
    @Builder.Default
    private Long totalImpressions = 0L;

    /** Tổng số lượt click — tăng atomic khi /clicked */
    @Column(name = "total_clicks", nullable = false)
    @Builder.Default
    private Long totalClicks = 0L;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Computed helpers ──────────────────────────────────────────────────────

    /** Click-through rate (%) */
    public double getCtr() {
        if (totalImpressions == null || totalImpressions == 0) return 0.0;
        return (totalClicks * 100.0) / totalImpressions;
    }

    /** Doanh thu ước tính (VNĐ) dựa trên CPM */
    public BigDecimal getEstimatedRevenueVnd() {
        if (cpmVnd == null || totalImpressions == null || totalImpressions == 0) return BigDecimal.ZERO;
        return cpmVnd.multiply(BigDecimal.valueOf(totalImpressions))
                     .divide(BigDecimal.valueOf(1000), 2, java.math.RoundingMode.HALF_UP);
    }

    /** Kiểm tra xem ad còn trong thời hạn chạy không */
    public boolean isScheduleValid() {
        LocalDate today = LocalDate.now();
        if (startDate != null && today.isBefore(startDate)) return false;
        if (endDate != null && today.isAfter(endDate)) return false;
        return true;
    }
}
