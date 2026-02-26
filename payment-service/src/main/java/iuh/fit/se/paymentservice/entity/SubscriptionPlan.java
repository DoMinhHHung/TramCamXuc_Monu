package iuh.fit.se.paymentservice.entity;

import iuh.fit.se.paymentservice.enums.PlanStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "subscription_plans")
public class SubscriptionPlan extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Tên plan: FREE, PREMIUM, ARTIST, ... */
    @Column(name = "name", nullable = false, unique = true)
    private String name;

    @Column(name = "description")
    private String description;

    /** Giá theo VNĐ */
    @Column(name = "price", nullable = false)
    private BigDecimal price;

    /** Số tháng của gói (1, 3, 6, 12) */
    @Column(name = "duration_months", nullable = false)
    private int durationMonths;

    /**
     * JSON string chứa các feature:
     * {"quality":"lossless","no_ads":true,"offline":true,
     *  "download":true,"playlist_limit":100,"can_become_artist":true,
     *  "create_album":true,"recommendation":true}
     */
    @Column(name = "features", columnDefinition = "TEXT", nullable = false)
    private String features;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PlanStatus status = PlanStatus.ACTIVE;
}