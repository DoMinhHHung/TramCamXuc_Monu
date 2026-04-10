package iuh.fit.se.musicservice.client;

import iuh.fit.se.musicservice.config.InternalFeignConfig;
import iuh.fit.se.musicservice.dto.internal.payment.InternalAiMusicConsumeRequest;
import iuh.fit.se.musicservice.dto.internal.payment.InternalAiMusicQuotaResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(
        name = "payment-service",
        contextId = "paymentAiMusicInternalClient",
        path = "/api/internal/ai-music",
        configuration = InternalFeignConfig.class)
public interface PaymentAiMusicInternalClient {

    @GetMapping("/quota/{userId}")
    InternalAiMusicQuotaResponse getQuota(
            @PathVariable("userId") UUID userId,
            @RequestParam("periodYm") String periodYm);

    @PostMapping("/consume")
    void consume(@RequestBody InternalAiMusicConsumeRequest request);
}
