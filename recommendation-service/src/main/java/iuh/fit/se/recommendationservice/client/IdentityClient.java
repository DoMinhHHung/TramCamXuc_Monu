package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.config.FeignConfig;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.FavoritesDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * Feign client để gọi identity-service.
 */
@FeignClient(
        name = "identity-service",
        path = "/users",
        configuration = FeignConfig.class
)
public interface IdentityClient {

    /**
     * Lấy favorites của user.
     * GET /users/my-favorites
     */
    @GetMapping("/my-favorites")
    ApiResponse<FavoritesDto> getMyFavorites(@RequestHeader("Authorization") String token);
}
