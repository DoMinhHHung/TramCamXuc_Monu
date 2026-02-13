package iuh.fit.se.payment.service;

import iuh.fit.se.payment.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface SubscriptionPlanService {

    SubscriptionPlanResponse createPlan(SubscriptionPlanRequest request);

    SubscriptionPlanResponse updatePlan(UUID id, SubscriptionPlanRequest request);

    void deletePlan(UUID id);

    SubscriptionPlanResponse getPlanById(UUID id);

    List<SubscriptionPlanResponse> getAllActivePlans();

    Page<SubscriptionPlanResponse> getAllPlans(Pageable pageable);

    void togglePlanStatus(UUID id);
}