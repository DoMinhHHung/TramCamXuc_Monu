package iuh.fit.se.adsservice.dto.response;

import iuh.fit.se.adsservice.enums.AdStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** Thông tin đầy đủ của một quảng cáo (dùng cho admin) */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdResponse {
    private UUID id;
    private String advertiserName;
    private String title;
    private String description;
    private String targetUrl;

    /** Presigned URL để nghe thử file MP3 */
    private String audioUrl;

    /** MinIO object key (chỉ dùng nội bộ / admin) */
    private String audioFileKey;

    private Integer durationSeconds;
    private AdStatus status;
    private BigDecimal cpmVnd;
    private BigDecimal budgetVnd;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long totalImpressions;
    private Long totalClicks;
    private Double ctr;
    private BigDecimal estimatedRevenueVnd;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
