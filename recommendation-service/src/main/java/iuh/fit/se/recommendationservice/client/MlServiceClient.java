package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.MlRecommendResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * HTTP client đến Python ML service.
 *
 * Dùng RestTemplate thay vì Feign vì Python service không register Eureka.
 * URL cấu hình qua ml.service.url trong application.yml.
 *
 * Circuit breaker đơn giản: nếu Python service unavailable → trả về empty list
 * → Spring service fallback sang trending/social recommendation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MlServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ml.service.url}")
    private String mlServiceUrl;

    /**
     * Lấy top-N songs từ Collaborative Filtering model (ALS).
     * Python endpoint: GET /recommend/cf/{userId}?limit={limit}
     *
     * @return danh sách (songId, score) hoặc empty nếu model chưa train/service down
     */
    public List<MlRecommendResponse.MlSongScore> getCfRecommendations(UUID userId, int limit) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(mlServiceUrl + "/recommend/cf/{userId}")
                    .queryParam("limit", limit)
                    .buildAndExpand(userId.toString())
                    .toUriString();

            ResponseEntity<MlRecommendResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    MlRecommendResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null
                    && response.getBody().getRecommendations() != null) {
                return response.getBody().getRecommendations();
            }

        } catch (ResourceAccessException e) {
            // Python service down → graceful degradation, không throw
            log.warn("[ML] CF service unavailable for userId={}: {}", userId, e.getMessage());
        } catch (Exception e) {
            log.error("[ML] Unexpected error fetching CF recs for userId={}: {}", userId, e.getMessage());
        }

        return Collections.emptyList();
    }

    /**
     * Lấy top-N songs từ Content-Based model.
     * Python endpoint: GET /recommend/cb/{userId}?limit={limit}
     *
     * Được gọi khi:
     * 1. CF trả về ít kết quả (cold-start hoặc sparse matrix)
     * 2. Cần supplement thêm diversity
     */
    public List<MlRecommendResponse.MlSongScore> getCbRecommendations(UUID userId, int limit) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(mlServiceUrl + "/recommend/cb/{userId}")
                    .queryParam("limit", limit)
                    .buildAndExpand(userId.toString())
                    .toUriString();

            ResponseEntity<MlRecommendResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, null, MlRecommendResponse.class);

            if (response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null
                    && response.getBody().getRecommendations() != null) {
                return response.getBody().getRecommendations();
            }

        } catch (Exception e) {
            log.warn("[ML] CB service unavailable for userId={}: {}", userId, e.getMessage());
        }

        return Collections.emptyList();
    }

    /**
     * Lấy bài hát tương tự cho một songId cụ thể.
     * Python endpoint: GET /recommend/similar/{songId}?limit={limit}
     *
     * Dùng cho: trang detail bài hát → "You might also like"
     */
    public List<MlRecommendResponse.MlSongScore> getSimilarSongs(UUID songId, int limit) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(mlServiceUrl + "/recommend/similar/{songId}")
                    .queryParam("limit", limit)
                    .buildAndExpand(songId.toString())
                    .toUriString();

            ResponseEntity<MlRecommendResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, null, MlRecommendResponse.class);

            if (response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null
                    && response.getBody().getRecommendations() != null) {
                return response.getBody().getRecommendations();
            }

        } catch (Exception e) {
            log.warn("[ML] Similar songs unavailable for songId={}: {}", songId, e.getMessage());
        }

        return Collections.emptyList();
    }

    /**
     * Kiểm tra Python ML service còn sống và model có fresh không.
     * Gọi bởi health check endpoint.
     */
    public boolean isHealthy() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    mlServiceUrl + "/health", String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }
}