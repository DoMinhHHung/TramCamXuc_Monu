package iuh.fit.se.recommendationservice.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.recommendationservice.dto.ml.MlRecommendRequest;
import iuh.fit.se.recommendationservice.dto.ml.MlRecommendResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class MlServiceClient {

    @Qualifier("mlRestTemplate")
    private final RestTemplate mlRestTemplate;

    private final ObjectMapper objectMapper;

    @Value("${ml.service.url:http://localhost:8088}")
    private String mlServiceUrl;

    /**
     * Gọi FastAPI /ml/recommend/for-you.
     * Nếu timeout (>5s) hoặc lỗi → trả Optional.empty() → fallback rule-based.
     */
    public Optional<MlRecommendResponse> getRecommendations(MlRecommendRequest request) {
        try {
            log.debug("Calling ML service for userId={}", request.getUserId());

            MlRecommendResponse response = mlRestTemplate.postForObject(
                    mlServiceUrl + "/ml/recommend/for-you",
                    request,
                    MlRecommendResponse.class
            );

            if (response == null || response.getSongs() == null
                    || response.getSongs().isEmpty()) {
                log.warn("ML service returned empty result for userId={}", request.getUserId());
                return Optional.empty();
            }

            log.info("ML service responded: strategy={}, songs={}, time={}ms",
                    response.getStrategy(),
                    response.getSongs().size(),
                    response.getComputeTimeMs());

            return Optional.of(response);

        } catch (ResourceAccessException e) {
            // Timeout 5s hoặc connection refused
            log.warn("ML service timeout/unavailable → fallback rule-based. Reason: {}",
                    e.getMessage());
            return Optional.empty();

        } catch (Exception e) {
            log.error("ML service unexpected error → fallback rule-based. Reason: {}",
                    e.getMessage());
            return Optional.empty();
        }
    }
}