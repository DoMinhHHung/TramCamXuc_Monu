package iuh.fit.se.payment.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SubscriptionPlanResponse {
    private UUID id;
    private String subsName;
    private String description;
    private Map<String, Object> features;
    private BigDecimal price;
    private Integer durationDays;
    private Boolean isActive;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}