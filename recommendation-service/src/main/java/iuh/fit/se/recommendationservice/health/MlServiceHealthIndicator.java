package iuh.fit.se.recommendationservice.health;

import iuh.fit.se.recommendationservice.client.MlServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Phản ánh trạng thái Python ML service (service-social trên Render) cho Actuator.
 * Probe định kỳ thay vì gọi /health đồng bộ mỗi request — tránh thundering herd khi cold start.
 */
@Component("mlService")
@RequiredArgsConstructor
@Slf4j
public class MlServiceHealthIndicator implements HealthIndicator {

    private static final String DEGRADED = "DEGRADED";

    private final MlServiceClient mlClient;

    private volatile boolean mlHealthy;

    @Scheduled(
            fixedDelayString = "${recommendation.health.ml-check-interval-ms:30000}",
            initialDelayString = "${recommendation.health.ml-check-initial-delay-ms:0}")
    public void refreshMlHealth() {
        boolean ok = mlClient.isHealthy();
        if (ok != mlHealthy) {
            log.info("[ML health] ml-service available={}", ok);
        }
        mlHealthy = ok;
    }

    @Override
    public Health health() {
        if (!mlHealthy) {
            return Health.status(DEGRADED)
                    .withDetail("ml-service", "unavailable — using trending/social fallback")
                    .build();
        }
        return Health.up()
                .withDetail("ml-service", "available")
                .build();
    }
}
