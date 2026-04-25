package iuh.fit.se.recommendationservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

/**
 * Admin-only view của trending analytics — expose score internals và velocity detail.
 * Chỉ trả về qua GET /admin/trending/analytics (cần ADMIN role).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminTrendingAnalyticsDto {

    private int    rank;
    private String songId;
    private String title;
    private String artistStageName;
    private String artistId;
    private String thumbnailUrl;
    private Long   playCount;

    /** Chi tiết breakdown của combined trending score */
    private ScoreBreakdown scoreBreakdown;

    /** Velocity và momentum */
    private VelocityInfo velocity;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ScoreBreakdown {
        /** Tổng combined score (sau freshness multiplier) */
        private double totalScore;

        /** Phần đóng góp của listen (50% weight, đã normalize) */
        private double listenContribution;

        /** Phần đóng góp của engagement (30% weight, đã normalize) */
        private double engagementContribution;

        /** Phần đóng góp của velocity (15% weight) */
        private double velocityContribution;

        /** Freshness multiplier (1.0 / 1.2 / 1.5 / 2.0) */
        private double freshnessMultiplier;

        /** Percent increase nhờ freshness */
        private double freshnessBonusPct;

        /** Raw listen score từ Redis ZSET (trước normalize) */
        private double rawListenScore;

        /** Raw engagement score từ Redis ZSET (trước normalize) */
        private double rawEngagementScore;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VelocityInfo {
        /** RISING | STABLE | FALLING */
        private String trend;

        /** Velocity normalized [0, 1] từ sigmoid */
        private double velocityScore;

        /** Mô tả dễ đọc: "Tăng mạnh", "Ổn định", "Đang giảm" */
        private String description;

        /** % tăng/giảm so với cùng giờ hôm qua (estimate) */
        private String growthRatePct;
    }
}
