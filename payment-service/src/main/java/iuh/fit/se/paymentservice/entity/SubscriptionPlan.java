package iuh.fit.se.paymentservice.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subscription_plans")
@EntityListeners(AuditingEntityListener.class)
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Tên gói: FREE, PREMIUM, ARTIST, ...
     */
    @Column(name = "subs_name", nullable = false, unique = true, length = 100)
    private String subsName;

    @Column(name = "description", length = 1000)
    private String description;

    /**
     * JSON chứa các feature:
     * {"quality":"lossless","no_ads":true,"offline":true,
     *  "download":true,"playlist_limit":100,"can_become_artist":true,
     *  "create_album":true,"recommendation":"advanced"}
     */
    @Type(JsonBinaryType.class)
    @Column(name = "features", columnDefinition = "jsonb")
    private Map<String, Object> features;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
