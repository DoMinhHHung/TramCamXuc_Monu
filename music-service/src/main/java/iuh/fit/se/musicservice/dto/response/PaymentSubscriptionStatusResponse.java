package iuh.fit.se.musicservice.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class PaymentSubscriptionStatusResponse {
    private UUID userId;
    private boolean active;
    private Map<String, Object> features;
    private LocalDateTime expiresAt;
}
