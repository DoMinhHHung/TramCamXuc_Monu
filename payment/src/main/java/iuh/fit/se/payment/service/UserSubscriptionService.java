package iuh.fit.se.payment.service;

import iuh.fit.se.payment.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.payment.dto.response.PaymentResponse;
import iuh.fit.se.payment.dto.response.UserSubscriptionResponse;

import java.util.List;

public interface UserSubscriptionService {

    PaymentResponse purchaseSubscription(PurchaseSubscriptionRequest request);

    UserSubscriptionResponse getMyActiveSubscription();

    List<UserSubscriptionResponse> getMySubscriptionHistory();

    void cancelSubscription();

    void processExpiredSubscriptions();
}