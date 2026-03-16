package iuh.fit.se.adsservice.dto.response;

import iuh.fit.se.adsservice.enums.AdStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdStatsResponse {
    private UUID id;
    private String advertiserName;
    private String title;
    private AdStatus status;

    // Budget & Revenue
    private BigDecimal cpmVnd;
    private BigDecimal budgetVnd;
    private BigDecimal estimatedRevenueVnd;
    private BigDecimal budgetUsedPercent;

    // Engagement
    private long totalImpressions;
    private long totalClicks;
    private double ctr; // click-through rate %

    // Impressions in date range (optional filters)
    private Long impressionsInRange;
    private Long clicksInRange;

    // Schedule
    private LocalDate startDate;
    private LocalDate endDate;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
