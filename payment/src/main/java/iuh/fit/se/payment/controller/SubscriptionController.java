package iuh.fit.se.payment.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.payment.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.payment.dto.response.PaymentResponse;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.payment.dto.response.UserSubscriptionResponse;
import iuh.fit.se.payment.service.SubscriptionPlanService;
import iuh.fit.se.payment.service.UserSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionPlanService subscriptionPlanService;
    private final UserSubscriptionService userSubscriptionService;

    @GetMapping("/plans")
    public ApiResponse<List<SubscriptionPlanResponse>> getActivePlans() {
        return ApiResponse.<List<SubscriptionPlanResponse>>builder()
                .result(subscriptionPlanService.getAllActivePlans())
                .build();
    }

    @PostMapping("/purchase")
    public ApiResponse<PaymentResponse> purchaseSubscription(
            @RequestBody @Valid PurchaseSubscriptionRequest request) {
        return ApiResponse.<PaymentResponse>builder()
                .result(userSubscriptionService.purchaseSubscription(request))
                .build();
    }

    @GetMapping("/my-subscription")
    public ApiResponse<UserSubscriptionResponse> getMyActiveSubscription() {
        return ApiResponse.<UserSubscriptionResponse>builder()
                .result(userSubscriptionService.getMyActiveSubscription())
                .build();
    }

    @GetMapping("/my-history")
    public ApiResponse<List<UserSubscriptionResponse>> getMySubscriptionHistory() {
        return ApiResponse.<List<UserSubscriptionResponse>>builder()
                .result(userSubscriptionService.getMySubscriptionHistory())
                .build();
    }

    @PostMapping("/cancel")
    public ApiResponse<Void> cancelSubscription() {
        userSubscriptionService.cancelSubscription();
        return ApiResponse.<Void>builder()
                .message("Subscription cancelled successfully")
                .build();
    }
}