package iuh.fit.se.identityservice.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.identityservice.config.RabbitMQConfig;
import iuh.fit.se.identityservice.event.FreePlanResponseEvent;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class FreePlanConfigService {

    private final ObjectMapper objectMapper;

    @Getter
    private String currentFreePlanName = "FREE";

    @Getter
    private String currentFreeFeaturesJson =
            "{\"quality\":\"128kbps\",\"no_ads\":false,\"offline\":false,\"playlist_limit\":5,\"can_become_artist\":false}";

    @RabbitListener(queues = RabbitMQConfig.IDENTITY_FREE_PLAN_QUEUE)
    public void onFreePlanReceived(FreePlanResponseEvent event) {
        log.info("Received FREE plan config from payment-service: {}", event);
        this.currentFreePlanName = event.getPlanName();
        try {
            this.currentFreeFeaturesJson = objectMapper.writeValueAsString(event.getFeatures());
            log.info("Updated FREE plan config in memory");
        } catch (JsonProcessingException e) {
            log.error("Failed to parse free plan features", e);
        }
    }
}