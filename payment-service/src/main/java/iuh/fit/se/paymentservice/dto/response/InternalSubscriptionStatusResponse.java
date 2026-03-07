package iuh.fit.se.paymentservice.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class InternalSubscriptionStatusResponse {
    private UUID userId;
    private boolean active;
    private Map<String, Object> features;
    private LocalDateTime expiresAt;
}
