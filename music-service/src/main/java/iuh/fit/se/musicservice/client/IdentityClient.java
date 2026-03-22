package iuh.fit.se.musicservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.UUID;


@FeignClient(name = "identity-service", path = "/internal", configuration = iuh.fit.se.musicservice.config.InternalFeignConfig.class)
public interface IdentityClient {

    @PostMapping("/users/{userId}/grant-artist-role")
    String grantArtistRoleAndIssueToken(@PathVariable("userId") UUID userId);
}
