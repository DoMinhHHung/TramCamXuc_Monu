package iuh.fit.se.socialservice.client;

import iuh.fit.se.socialservice.client.dto.PublicProfileEnvelope;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "identity-service", contextId = "identityPublicProfileClient", path = "/users")
public interface IdentityPublicProfileClient {

    @GetMapping("/public/{userId}")
    PublicProfileEnvelope getPublicProfile(@PathVariable("userId") String userId);
}
