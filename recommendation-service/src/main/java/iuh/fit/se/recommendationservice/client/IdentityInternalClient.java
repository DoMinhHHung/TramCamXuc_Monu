package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.config.FeignConfig;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.UserFavoritesDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "identity-service", path = "/users", configuration = FeignConfig.class )
public interface IdentityInternalClient {

    @GetMapping("/my-favorites")
    ApiResponse<UserFavoritesDto> getMyFavorites();
}