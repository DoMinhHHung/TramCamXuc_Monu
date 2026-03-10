package iuh.fit.se.paymentservice.controller;

import iuh.fit.se.paymentservice.dto.ApiResponse;
import iuh.fit.se.paymentservice.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.paymentservice.dto.response.PaymentResponse;
import iuh.fit.se.paymentservice.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.paymentservice.dto.response.UserSubscriptionResponse;
import iuh.fit.se.paymentservice.service.SubscriptionPlanService;
import iuh.fit.se.paymentservice.service.UserSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscription", description = "Subscription management APIs for users")
public class SubscriptionController {

    private final SubscriptionPlanService planService;
    private final UserSubscriptionService userSubscriptionService;

    // ─── Public ───────────────────────────────────────────────

    @GetMapping("/plans")
    @Operation(summary = "Get all active subscription plans (public)")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> getActivePlans() {
        return ResponseEntity.ok(ApiResponse.<List<SubscriptionPlanResponse>>builder()
                .code(1000)
                .message("Success")
                .result(planService.getAllActivePlans())
                .build());
    }

    // ─── Authenticated user ───────────────────────────────────

    @PostMapping("/purchase")
    @Operation(summary = "Purchase a subscription plan")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PaymentResponse>> purchase(
            @Valid @RequestBody PurchaseSubscriptionRequest request) {
        PaymentResponse response = userSubscriptionService.purchaseSubscription(request);
        return ResponseEntity.ok(ApiResponse.<PaymentResponse>builder()
                .code(1000)
                .message("Payment link created, please complete the payment")
                .result(response)
                .build());
    }

    @GetMapping("/my")
    @Operation(summary = "Get my active subscription")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserSubscriptionResponse>> getMySubscription() {
        UserSubscriptionResponse response = userSubscriptionService.getMyActiveSubscription();
        return ResponseEntity.ok(ApiResponse.<UserSubscriptionResponse>builder()
                .code(1000)
                .message("Success")
                .result(response)
                .build());
    }

    @GetMapping("/my/history")
    @Operation(summary = "Get my subscription history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<UserSubscriptionResponse>>> getMyHistory() {
        List<UserSubscriptionResponse> history = userSubscriptionService.getMySubscriptionHistory();
        return ResponseEntity.ok(ApiResponse.<List<UserSubscriptionResponse>>builder()
                .code(1000)
                .message("Success")
                .result(history)
                .build());
    }

    @DeleteMapping("/my/cancel")
    @Operation(summary = "Cancel my active subscription")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> cancelMySubscription() {
        userSubscriptionService.cancelSubscription();
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000)
                .message("Subscription cancelled successfully")
                .build());
    }
}
