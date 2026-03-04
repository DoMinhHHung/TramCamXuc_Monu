package iuh.fit.se.paymentservice.service;

import iuh.fit.se.paymentservice.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.paymentservice.dto.response.PaymentResponse;
import iuh.fit.se.paymentservice.dto.response.UserSubscriptionResponse;

import java.util.List;

public interface UserSubscriptionService {

    PaymentResponse purchaseSubscription(PurchaseSubscriptionRequest request);

    UserSubscriptionResponse getMyActiveSubscription();

    List<UserSubscriptionResponse> getMySubscriptionHistory();

    void cancelSubscription();

    void processExpiredSubscriptions();
}
