package iuh.fit.se.paymentservice.controller;

import iuh.fit.se.paymentservice.dto.ApiResponse;
import iuh.fit.se.paymentservice.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.paymentservice.dto.request.SubscriptionPlanUpdateRequest;
import iuh.fit.se.paymentservice.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.paymentservice.service.SubscriptionAnalyticsService;
import iuh.fit.se.paymentservice.service.SubscriptionPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import iuh.fit.se.paymentservice.repository.PaymentTransactionRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.entity.PaymentTransaction;
import iuh.fit.se.paymentservice.enums.PaymentStatus;
import org.springframework.format.annotation.DateTimeFormat;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Admin - Subscription Plans", description = "Admin APIs for managing subscription plans")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSubscriptionController {

        private final SubscriptionPlanService planService;
        private final SubscriptionAnalyticsService analyticsService;
        /**
         * API: GET /admin/subscriptions/stats?from=&to=
         * Trả về doanh thu thực tế theo ngày từ PaymentTransaction (COMPLETED)
         * Response: [{date: yyyy-MM-dd, total: BigDecimal}]
         */
    @GetMapping("/stats")
    @Operation(summary = "Get revenue stats by day")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRevenueStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        List<Map<String, Object>> result = analyticsService.getRevenueStats(from, to);
        return ResponseEntity.ok(ApiResponse.<List<Map<String, Object>>>builder()
                .code(1000)
                .message("Success")
                .result(result)
                .build());
    }

        /**
         * API: GET /admin/subscriptions/active-per-plan
         * Trả về số lượng active subscription theo từng plan
         * Response: [{planId, planName, count}]
         */
    @GetMapping("/active-per-plan")
    @Operation(summary = "Get active subscriptions per plan")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getActivePerPlan() {
        List<Map<String, Object>> result = analyticsService.getActivePerPlan();
        return ResponseEntity.ok(ApiResponse.<List<Map<String, Object>>>builder()
                .code(1000)
                .message("Success")
                .result(result)
                .build());
    }

    @GetMapping("/plans")
    @Operation(summary = "Get all plans (including inactive) — paged")
    public ResponseEntity<ApiResponse<Page<SubscriptionPlanResponse>>> getAllPlans(Pageable pageable) {
        Page<SubscriptionPlanResponse> page = planService.getAllPlans(pageable);
        return ResponseEntity.ok(ApiResponse.<Page<SubscriptionPlanResponse>>builder()
                .code(1000)
                .message("Success")
                .result(page)
                .build());
    }

    @GetMapping("/plans/{id}")
    @Operation(summary = "Get plan by ID")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> getPlanById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.<SubscriptionPlanResponse>builder()
                .code(1000)
                .message("Success")
                .result(planService.getPlanById(id))
                .build());
    }

    @PostMapping("/plans")
    @Operation(summary = "Create a new subscription plan")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> createPlan(
            @Valid @RequestBody SubscriptionPlanRequest request) {
        SubscriptionPlanResponse response = planService.createPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<SubscriptionPlanResponse>builder()
                        .code(1000)
                        .message("Subscription plan created successfully")
                        .result(response)
                        .build());
    }

    @PutMapping("/plans/{id}")
    @Operation(summary = "Update subscription plan (partial update)")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> updatePlan(
            @PathVariable UUID id,
            @Valid @RequestBody SubscriptionPlanUpdateRequest request) {
        SubscriptionPlanResponse response = planService.updatePlan(id, request);
        return ResponseEntity.ok(ApiResponse.<SubscriptionPlanResponse>builder()
                .code(1000)
                .message("Subscription plan updated successfully")
                .result(response)
                .build());
    }

    @PatchMapping("/plans/{id}/toggle")
    @Operation(summary = "Toggle plan active/inactive status")
    public ResponseEntity<ApiResponse<Void>> toggleStatus(@PathVariable UUID id) {
        planService.togglePlanStatus(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000)
                .message("Plan status toggled")
                .build());
    }

    @DeleteMapping("/plans/{id}")
    @Operation(summary = "Delete a subscription plan (must have no active subscriptions)")
    public ResponseEntity<ApiResponse<Void>> deletePlan(@PathVariable UUID id) {
        planService.deletePlan(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000)
                .message("Subscription plan deleted successfully")
                .build());
    }
}
