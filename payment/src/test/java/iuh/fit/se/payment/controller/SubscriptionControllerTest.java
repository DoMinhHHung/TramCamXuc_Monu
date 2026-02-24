package iuh.fit.se.payment.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.payment.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.payment.dto.response.PaymentResponse;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.payment.dto.response.UserSubscriptionResponse;
import iuh.fit.se.payment.service.SubscriptionPlanService;
import iuh.fit.se.payment.service.UserSubscriptionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionControllerTest {

    @Mock
    private SubscriptionPlanService subscriptionPlanService;

    @Mock
    private UserSubscriptionService userSubscriptionService;

    @InjectMocks
    private SubscriptionController subscriptionController;

    @Test
    void getActivePlans_shouldReturnAllActivePlans() {
        List<SubscriptionPlanResponse> plans = List.of(SubscriptionPlanResponse.builder().subsName("Pro").build());
        when(subscriptionPlanService.getAllActivePlans()).thenReturn(plans);

        ApiResponse<List<SubscriptionPlanResponse>> response = subscriptionController.getActivePlans();

        assertEquals(plans, response.getResult());
        verify(subscriptionPlanService).getAllActivePlans();
    }

    @Test
    void purchaseSubscription_shouldReturnPaymentResponse() {
        PurchaseSubscriptionRequest request = PurchaseSubscriptionRequest.builder()
                .planId(UUID.randomUUID())
                .autoRenew(true)
                .build();
        PaymentResponse paymentResponse = PaymentResponse.builder().checkoutUrl("https://checkout").build();
        when(userSubscriptionService.purchaseSubscription(request)).thenReturn(paymentResponse);

        ApiResponse<PaymentResponse> response = subscriptionController.purchaseSubscription(request);

        assertEquals(paymentResponse, response.getResult());
        verify(userSubscriptionService).purchaseSubscription(request);
    }

    @Test
    void getMyActiveSubscription_shouldReturnCurrentSubscription() {
        UserSubscriptionResponse activeSub = UserSubscriptionResponse.builder().autoRenew(true).build();
        when(userSubscriptionService.getMyActiveSubscription()).thenReturn(activeSub);

        ApiResponse<UserSubscriptionResponse> response = subscriptionController.getMyActiveSubscription();

        assertEquals(activeSub, response.getResult());
        verify(userSubscriptionService).getMyActiveSubscription();
    }

    @Test
    void getMySubscriptionHistory_shouldReturnHistoryList() {
        List<UserSubscriptionResponse> history = List.of(UserSubscriptionResponse.builder().build());
        when(userSubscriptionService.getMySubscriptionHistory()).thenReturn(history);

        ApiResponse<List<UserSubscriptionResponse>> response = subscriptionController.getMySubscriptionHistory();

        assertEquals(history, response.getResult());
        verify(userSubscriptionService).getMySubscriptionHistory();
    }

    @Test
    void cancelSubscription_shouldCallServiceAndReturnSuccessMessage() {
        ApiResponse<Void> response = subscriptionController.cancelSubscription();

        assertEquals("Subscription cancelled successfully", response.getMessage());
        assertNull(response.getResult());
        verify(userSubscriptionService).cancelSubscription();
    }
}
