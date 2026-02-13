package iuh.fit.se.payment.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.payment.dto.request.PayOSWebhookRequest;
import iuh.fit.se.payment.dto.request.PaymentCancelRequest;
import iuh.fit.se.payment.service.PayOSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/service-payment/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PayOSService payOSService;

    @PostMapping("/payos_transfer_handler")
    public ResponseEntity<ApiResponse<String>> handlePayOSWebhook(
            @RequestBody PayOSWebhookRequest webhookRequest) {
        try {
            log.info("Received PayOS webhook for order: {}",
                    webhookRequest.getData().getOrderCode());

            payOSService.handleWebhook(webhookRequest);

            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .message("Webhook processed successfully")
                    .result("success")
                    .build());
        } catch (Exception e) {
            log.error("Error processing webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<String>builder()
                            .code(9999)
                            .message("Webhook processing failed: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/{orderCode}")
    public ApiResponse<Object> getPaymentInfo(@PathVariable Long orderCode) {
        return ApiResponse.builder()
                .result(payOSService.getPaymentLinkInformation(orderCode))
                .build();
    }

    @PostMapping("/{orderCode}/cancel")
    public ApiResponse<Object> cancelPayment(
            @PathVariable Long orderCode,
            @RequestBody(required = false) PaymentCancelRequest request) {

        String reason = (request != null && request.getCancellationReason() != null)
                ? request.getCancellationReason()
                : "Cancelled by user";

        return ApiResponse.builder()
                .result(payOSService.cancelPaymentLink(orderCode, reason))
                .message("Payment cancelled successfully")
                .build();
    }
}