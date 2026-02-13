package iuh.fit.se.payment.dto.request;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaymentCancelRequest {
    private String cancellationReason;
}