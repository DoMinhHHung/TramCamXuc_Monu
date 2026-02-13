package iuh.fit.se.payment.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaymentResponse {
    private String checkoutUrl;
    private String qrCode;
    private String referenceCode;
    private Long orderCode;
    private String message;
}