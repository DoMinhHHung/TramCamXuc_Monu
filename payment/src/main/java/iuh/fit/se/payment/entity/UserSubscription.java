package iuh.fit.se.payment.entity;

import iuh.fit.se.core.entity.BaseEntity;
import iuh.fit.se.payment.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "user_subscriptions",
        indexes = {
                @Index(name = "idx_user_subscriptions_user_id", columnList = "user_id"),
                @Index(name = "idx_user_subscriptions_status", columnList = "status"),
                @Index(name = "idx_user_subscriptions_expires_at", columnList = "expires_at")
        }
)
public class UserSubscription extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.PENDING;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "auto_renew")
    @Builder.Default
    private Boolean autoRenew = false;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
}