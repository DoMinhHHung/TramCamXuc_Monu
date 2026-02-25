package iuh.fit.se.music.client;

import iuh.fit.se.music.dto.response.internal.InternalApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "IDENTITY-SERVICE")
public interface IdentityServiceClient {

    @GetMapping("/internal/users/{userId}/exists")
    InternalApiResponse<Boolean> userExists(@PathVariable("userId") String userId);
}
