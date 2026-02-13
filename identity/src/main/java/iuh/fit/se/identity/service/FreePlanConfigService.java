package iuh.fit.se.identity.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.core.event.FreePlanResponseEvent;
import iuh.fit.se.core.event.RequestFreePlanEvent;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FreePlanConfigService {
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Getter
    private String currentFreePlanName = "FREE";
    @Getter
    private String currentFreeFeaturesJson = "{\"quality\":\"128kbps\",\"no_ads\":false,\"offline\":false,\"playlist_limit\":5,\"can_become_artist\":false}";

    @EventListener(ApplicationReadyEvent.class)
    public void requestConfigOnStartup() {
        log.info("Identity started. Requesting FREE plan config from Payment...");
        eventPublisher.publishEvent(new RequestFreePlanEvent());
    }

    @EventListener
    public void onConfigReceived(FreePlanResponseEvent event) {
        log.info("Received FREE plan config from Payment: {}", event);
        this.currentFreePlanName = event.getPlanName();
        try {
            this.currentFreeFeaturesJson = objectMapper.writeValueAsString(event.getFeatures());
            log.info("Updated Free Plan Config in Memory");
        } catch (JsonProcessingException e) {
            log.error("Error parsing free plan features", e);
        }
    }
}
