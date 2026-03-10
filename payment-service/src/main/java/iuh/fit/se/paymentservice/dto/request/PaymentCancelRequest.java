package iuh.fit.se.paymentservice.dto.request;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaymentCancelRequest {
    private String cancellationReason;
}
