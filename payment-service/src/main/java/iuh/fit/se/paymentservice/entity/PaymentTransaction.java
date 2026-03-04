package iuh.fit.se.paymentservice.entity;

import iuh.fit.se.paymentservice.enums.PaymentMethod;
import iuh.fit.se.paymentservice.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "payment_transactions",
        indexes = {
                @Index(name = "idx_payment_user_id", columnList = "user_id"),
                @Index(name = "idx_payment_status", columnList = "status"),
                @Index(name = "idx_payment_order_code", columnList = "order_code"),
                @Index(name = "idx_payment_reference_code", columnList = "reference_code")
        }
)
@EntityListeners(AuditingEntityListener.class)
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private UserSubscription subscription;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "reference_code", unique = true, length = 100)
    private String referenceCode;

    /** Mã đơn hàng gửi sang PayOS */
    @Column(name = "order_code", unique = true)
    private Long orderCode;

    @Column(name = "provider_transaction_id", length = 255)
    private String providerTransactionId;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "checkout_url", length = 1000)
    private String checkoutUrl;

    @Column(name = "qr_code", length = 1000)
    private String qrCode;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
