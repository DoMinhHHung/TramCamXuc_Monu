package iuh.fit.se.paymentservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SubscriptionActiveEvent implements Serializable {
    private UUID userId;
    private String planName;
    private Map<String, Object> features;
}