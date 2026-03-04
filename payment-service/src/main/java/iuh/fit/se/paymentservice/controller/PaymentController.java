package iuh.fit.se.paymentservice.controller;

import iuh.fit.se.paymentservice.dto.ApiResponse;
import iuh.fit.se.paymentservice.dto.request.PaymentCancelRequest;
import iuh.fit.se.paymentservice.dto.request.PayOSWebhookRequest;
import iuh.fit.se.paymentservice.service.PayOSService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payment", description = "Payment management APIs")
public class PaymentController {

    private final PayOSService payOSService;

    @PostMapping("/payos_transfer_handler")
    @Operation(summary = "PayOS Webhook Handler (public)")
    public ResponseEntity<ApiResponse<String>> handleWebhook(
            @RequestBody PayOSWebhookRequest request) {
        log.info("Received PayOS webhook, orderCode={}", 
                request.getData() != null ? request.getData().getOrderCode() : "N/A");
        payOSService.handleWebhook(request);
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .code(1000)
                .message("Webhook processed")
                .result("OK")
                .build());
    }

    /**
     * Lấy thông tin payment link theo orderCode.
     */
    @GetMapping("/{orderCode}")
    @Operation(summary = "Get payment link information")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Object>> getPaymentInfo(
            @PathVariable Long orderCode) {
        Object info = payOSService.getPaymentLinkInformation(orderCode);
        return ResponseEntity.ok(ApiResponse.builder()
                .code(1000)
                .message("Success")
                .result(info)
                .build());
    }

    /**
     * Huỷ payment link theo orderCode (user tự huỷ).
     */
    @PutMapping("/{orderCode}/cancel")
    @Operation(summary = "Cancel a payment link")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Object>> cancelPayment(
            @PathVariable Long orderCode,
            @RequestBody(required = false) PaymentCancelRequest request) {
        String reason = request != null ? request.getCancellationReason() : "User cancelled";
        Object result = payOSService.cancelPaymentLink(orderCode, reason);
        return ResponseEntity.ok(ApiResponse.builder()
                .code(1000)
                .message("Payment cancelled")
                .result(result)
                .build());
    }
}
