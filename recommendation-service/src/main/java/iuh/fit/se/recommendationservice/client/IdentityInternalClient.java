package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.UserFavoritesDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "identity-service", path = "/users")
public interface IdentityInternalClient {

    /**
     * Lấy favorite genres và artists của user.
     * Dùng khi user mới (chưa có listen history) → cold-start rec.
     * Endpoint này cần JWT — Spring recommendation-service truyền token qua Feign config.
     */
    @GetMapping("/my-favorites")
    ApiResponse<UserFavoritesDto> getMyFavorites();
}