package iuh.fit.se.music.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.UUID;

@FeignClient(name = "social-service", path = "/api/v1/social")
public interface SocialServiceClient {

    @GetMapping("/internal/listen-stats/{songId}")
    Map<String, Object> getListenStats(@PathVariable("songId") UUID songId);
}
