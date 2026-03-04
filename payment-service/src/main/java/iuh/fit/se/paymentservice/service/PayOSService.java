package iuh.fit.se.paymentservice.service;

import iuh.fit.se.paymentservice.dto.request.PayOSWebhookRequest;
import iuh.fit.se.paymentservice.dto.response.PaymentResponse;

import java.math.BigDecimal;
import java.util.UUID;

public interface PayOSService {

    PaymentResponse createPaymentLink(
            UUID userId,
            UUID subscriptionId,
            String planName,
            BigDecimal amount,
            String description
    );

    Object getPaymentLinkInformation(Long orderCode);

    Object cancelPaymentLink(Long orderCode, String reason);

    void handleWebhook(PayOSWebhookRequest request);
}
