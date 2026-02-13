package iuh.fit.se.payment.dto.response;

import iuh.fit.se.payment.enums.SubscriptionStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserSubscriptionResponse {
    private UUID id;
    private UUID userId;
    private SubscriptionPlanResponse plan;
    private SubscriptionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private Boolean autoRenew;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
}