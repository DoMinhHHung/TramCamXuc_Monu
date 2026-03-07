package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.MlRecommendationRequest;
import iuh.fit.se.recommendationservice.dto.MlRecommendationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;


@Component
@RequiredArgsConstructor
@Slf4j
public class MlServiceClient {

    private final RestTemplate mlRestTemplate;

    @Value("${ml.service.url}")
    private String mlServiceUrl;

    /**
     * Gọi ml-service để lấy gợi ý For You.
     * Trả về Optional.empty() nếu ML unavailable → caller fallback sang rule-based.
     */
    public Optional<MlRecommendationResponse> getForYouRecommendations(MlRecommendationRequest request) {
        return post("/ml/recommendations/for-you", request);
    }

    /**
     * Gọi ml-service để lấy bài tương tự.
     */
    public Optional<MlRecommendationResponse> getSimilarSongs(MlRecommendationRequest request) {
        return post("/ml/recommendations/similar", request);
    }

    // ── private ──────────────────────────────────────────────────

    private Optional<MlRecommendationResponse> post(String path, MlRecommendationRequest request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<MlRecommendationRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<MlRecommendationResponse> response = mlRestTemplate.exchange(
                    mlServiceUrl + path,
                    HttpMethod.POST,
                    entity,
                    MlRecommendationResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return Optional.of(response.getBody());
            }
            return Optional.empty();

        } catch (Exception e) {
            // Không throw — log và trả về empty để fallback sang rule-based
            log.warn("ml-service unavailable ({}): {}", path, e.getMessage());
            return Optional.empty();
        }
    }
}