package iuh.fit.se.core.dto.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionUpgradeRequestedEvent implements Serializable {
    private UUID userId;
    private UUID subscriptionId;
    private UUID transactionId;
    private String planName;
    private Map<String, Object> features;
}
