package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.config.InternalFeignConfig;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.UserFavoritesDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "identity-service", path = "/internal/users", configuration = InternalFeignConfig.class )
public interface IdentityInternalClient {

    @GetMapping("/{userId}/favorites")
    ApiResponse<UserFavoritesDto> getUserFavorites(@PathVariable("userId") String userId);
}