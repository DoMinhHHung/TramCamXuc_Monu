package iuh.fit.se.paymentservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PurchaseSubscriptionRequest {

    @NotNull(message = "Plan ID must not be null")
    private UUID planId;

    private Boolean autoRenew;
}
