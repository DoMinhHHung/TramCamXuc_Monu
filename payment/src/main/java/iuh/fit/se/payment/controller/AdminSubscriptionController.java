package iuh.fit.se.payment.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.payment.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.payment.dto.request.SubscriptionPlanUpdateRequest;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.payment.service.SubscriptionPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/subscriptions")
@RequiredArgsConstructor
public class AdminSubscriptionController {

    private final SubscriptionPlanService subscriptionPlanService;

    @PostMapping("/plans")
    @PreAuthorize(("hasRole('ADMIN')"))
    public ApiResponse<SubscriptionPlanResponse> createPlan(
            @RequestBody @Valid SubscriptionPlanRequest request) {
        return ApiResponse.<SubscriptionPlanResponse>builder()
                .result(subscriptionPlanService.createPlan(request))
                .build();
    }

    @PatchMapping("/plans/{id}")
    @PreAuthorize(("hasRole('ADMIN')"))
    public ApiResponse<SubscriptionPlanResponse> updatePlan(
            @PathVariable("id") UUID id,
            @RequestBody @Valid SubscriptionPlanUpdateRequest request) {
        return ApiResponse.<SubscriptionPlanResponse>builder()
                .result(subscriptionPlanService.updatePlan(id, request))
                .build();
    }

    @DeleteMapping("/plans/{id}")
    @PreAuthorize(("hasRole('ADMIN')"))
    public ApiResponse<Void> deletePlan(@PathVariable UUID id) {
        subscriptionPlanService.deletePlan(id);
        return ApiResponse.<Void>builder()
                .message("Subscription plan deleted successfully")
                .build();
    }

    @PatchMapping("/plans/{id}/toggle-status")
    @PreAuthorize(("hasRole('ADMIN')"))
    public ApiResponse<Void> togglePlanStatus(@PathVariable UUID id) {
        subscriptionPlanService.togglePlanStatus(id);
        return ApiResponse.<Void>builder()
                .message("Plan status toggled successfully")
                .build();
    }

    @GetMapping("/plans")
    public ApiResponse<Page<SubscriptionPlanResponse>> getAllPlans(
            @RequestParam(defaultValue = "1", name = "page") int page,
            @RequestParam(defaultValue = "10", name = "size") int size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("displayOrder").ascending());
        return ApiResponse.<Page<SubscriptionPlanResponse>>builder()
                .result(subscriptionPlanService.getAllPlans(pageable))
                .build();
    }

    @GetMapping("/plans/{id}")
    public ApiResponse<SubscriptionPlanResponse> getPlanById(@PathVariable UUID id) {
        return ApiResponse.<SubscriptionPlanResponse>builder()
                .result(subscriptionPlanService.getPlanById(id))
                .build();
    }
}