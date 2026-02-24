package iuh.fit.se.payment.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.payment.dto.request.PayOSWebhookRequest;
import iuh.fit.se.payment.dto.request.PaymentCancelRequest;
import iuh.fit.se.payment.service.PayOSService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PayOSService payOSService;

    @InjectMocks
    private PaymentController paymentController;

    @Test
    void handlePayOSWebhook_shouldReturnSuccessResponse_whenProcessingSuccess() {
        PayOSWebhookRequest webhookRequest = PayOSWebhookRequest.builder()
                .data(PayOSWebhookRequest.WebhookData.builder().orderCode(12345L).build())
                .build();

        ResponseEntity<ApiResponse<String>> response = paymentController.handlePayOSWebhook(webhookRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Webhook processed successfully", response.getBody().getMessage());
        assertEquals("success", response.getBody().getResult());
        verify(payOSService).handleWebhook(webhookRequest);
    }

    @Test
    void handlePayOSWebhook_shouldReturnErrorResponse_whenServiceThrowsException() {
        PayOSWebhookRequest webhookRequest = PayOSWebhookRequest.builder()
                .data(PayOSWebhookRequest.WebhookData.builder().orderCode(12345L).build())
                .build();
        doThrow(new RuntimeException("invalid signature")).when(payOSService).handleWebhook(webhookRequest);

        ResponseEntity<ApiResponse<String>> response = paymentController.handlePayOSWebhook(webhookRequest);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(9999, response.getBody().getCode());
        assertTrue(response.getBody().getMessage().contains("invalid signature"));
        verify(payOSService).handleWebhook(webhookRequest);
    }

    @Test
    void getPaymentInfo_shouldWrapServiceResultIntoApiResponse() {
        Long orderCode = 999L;
        Object paymentInfo = new Object();
        when(payOSService.getPaymentLinkInformation(orderCode)).thenReturn(paymentInfo);

        ApiResponse<Object> response = paymentController.getPaymentInfo(orderCode);

        assertEquals(1000, response.getCode());
        assertEquals(paymentInfo, response.getResult());
        verify(payOSService).getPaymentLinkInformation(orderCode);
    }

    @Test
    void cancelPayment_shouldUseRequestReason_whenReasonProvided() {
        Long orderCode = 999L;
        PaymentCancelRequest request = PaymentCancelRequest.builder()
                .cancellationReason("Customer requested cancellation")
                .build();
        Object cancelledResult = new Object();
        when(payOSService.cancelPaymentLink(orderCode, "Customer requested cancellation"))
                .thenReturn(cancelledResult);

        ApiResponse<Object> response = paymentController.cancelPayment(orderCode, request);

        assertEquals("Payment cancelled successfully", response.getMessage());
        assertEquals(cancelledResult, response.getResult());
        verify(payOSService).cancelPaymentLink(orderCode, "Customer requested cancellation");
    }

    @Test
    void cancelPayment_shouldUseDefaultReason_whenRequestIsNull() {
        Long orderCode = 999L;
        Object cancelledResult = new Object();
        when(payOSService.cancelPaymentLink(orderCode, "Cancelled by user"))
                .thenReturn(cancelledResult);

        ApiResponse<Object> response = paymentController.cancelPayment(orderCode, null);

        assertEquals("Payment cancelled successfully", response.getMessage());
        assertEquals(cancelledResult, response.getResult());
        verify(payOSService).cancelPaymentLink(orderCode, "Cancelled by user");
    }
}
