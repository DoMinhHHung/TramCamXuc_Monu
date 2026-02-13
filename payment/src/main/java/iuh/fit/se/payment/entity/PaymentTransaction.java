package iuh.fit.se.payment.entity;

import iuh.fit.se.core.entity.BaseEntity;
import iuh.fit.se.payment.enums.PaymentMethod;
import iuh.fit.se.payment.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
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
                @Index(name = "idx_payment_transactions_user_id", columnList = "user_id"),
                @Index(name = "idx_payment_transactions_status", columnList = "status"),
                @Index(name = "idx_payment_transactions_reference", columnList = "reference_code"),
                @Index(name = "idx_payment_transactions_order_code", columnList = "order_code")
        }
)
public class PaymentTransaction extends BaseEntity {

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

    // PayOS specific fields
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
}