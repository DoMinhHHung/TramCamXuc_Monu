package iuh.fit.se.musicservice.client;

import iuh.fit.se.musicservice.dto.response.PaymentSubscriptionStatusResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "payment-service", path = "/api/internal/subscriptions", configuration = iuh.fit.se.musicservice.config.InternalFeignConfig.class)
public interface PaymentInternalClient {

    @GetMapping("/{userId}/status")
    PaymentSubscriptionStatusResponse getSubscriptionStatus(@PathVariable("userId") UUID userId);
}
