package iuh.fit.se.payment.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.payment.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.payment.dto.request.SubscriptionPlanUpdateRequest;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.payment.service.SubscriptionPlanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSubscriptionControllerTest {

    @Mock
    private SubscriptionPlanService subscriptionPlanService;

    @InjectMocks
    private AdminSubscriptionController adminSubscriptionController;

    @Test
    void createPlan_shouldReturnCreatedPlan() {
        SubscriptionPlanRequest request = SubscriptionPlanRequest.builder()
                .subsName("Premium")
                .description("premium plan")
                .features(Map.of("quality", "lossless"))
                .price(BigDecimal.valueOf(199000))
                .durationDays(30)
                .build();
        SubscriptionPlanResponse created = SubscriptionPlanResponse.builder().subsName("Premium").build();
        when(subscriptionPlanService.createPlan(request)).thenReturn(created);

        ApiResponse<SubscriptionPlanResponse> response = adminSubscriptionController.createPlan(request);

        assertEquals(created, response.getResult());
        verify(subscriptionPlanService).createPlan(request);
    }

    @Test
    void updatePlan_shouldReturnUpdatedPlan() {
        UUID id = UUID.randomUUID();
        SubscriptionPlanUpdateRequest request = SubscriptionPlanUpdateRequest.builder()
                .price(BigDecimal.valueOf(299000))
                .build();
        SubscriptionPlanResponse updated = SubscriptionPlanResponse.builder().id(id).build();
        when(subscriptionPlanService.updatePlan(id, request)).thenReturn(updated);

        ApiResponse<SubscriptionPlanResponse> response = adminSubscriptionController.updatePlan(id, request);

        assertEquals(updated, response.getResult());
        verify(subscriptionPlanService).updatePlan(id, request);
    }

    @Test
    void deletePlan_shouldCallServiceAndReturnSuccessMessage() {
        UUID id = UUID.randomUUID();

        ApiResponse<Void> response = adminSubscriptionController.deletePlan(id);

        assertEquals("Subscription plan deleted successfully", response.getMessage());
        verify(subscriptionPlanService).deletePlan(id);
    }

    @Test
    void togglePlanStatus_shouldCallServiceAndReturnSuccessMessage() {
        UUID id = UUID.randomUUID();

        ApiResponse<Void> response = adminSubscriptionController.togglePlanStatus(id);

        assertEquals("Plan status toggled successfully", response.getMessage());
        verify(subscriptionPlanService).togglePlanStatus(id);
    }

    @Test
    void getAllPlans_shouldConvertOneBasedPageToZeroBasedAndReturnPageData() {
        Pageable expectedPageable = PageRequest.of(1, 5, Sort.by("displayOrder").ascending());
        Page<SubscriptionPlanResponse> pageData = new PageImpl<>(
                List.of(SubscriptionPlanResponse.builder().subsName("Free").build()),
                expectedPageable,
                1
        );
        when(subscriptionPlanService.getAllPlans(any(Pageable.class))).thenReturn(pageData);

        ApiResponse<Page<SubscriptionPlanResponse>> response = adminSubscriptionController.getAllPlans(2, 5);

        assertEquals(pageData, response.getResult());
        verify(subscriptionPlanService).getAllPlans(expectedPageable);
    }

    @Test
    void getPlanById_shouldReturnPlanDetails() {
        UUID id = UUID.randomUUID();
        SubscriptionPlanResponse plan = SubscriptionPlanResponse.builder().id(id).subsName("Pro").build();
        when(subscriptionPlanService.getPlanById(id)).thenReturn(plan);

        ApiResponse<SubscriptionPlanResponse> response = adminSubscriptionController.getPlanById(id);

        assertEquals(plan, response.getResult());
        verify(subscriptionPlanService).getPlanById(id);
    }
}
