package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.config.FeignConfig;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.ListenHistoryDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(
        name = "social-service",
        path = "/internal/social",
        configuration = FeignConfig.class
)
public interface SocialServiceClient {

    @GetMapping("/listen-history/{userId}")
    ApiResponse<List<ListenHistoryDto>> getListenHistory(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "200") int limit,
            @RequestParam(defaultValue = "90") int days);

    @GetMapping("/follows/{userId}/artists")
    ApiResponse<List<String>> getFollowedArtistIds(@PathVariable UUID userId);

    @GetMapping("/reactions/{userId}/liked")
    ApiResponse<List<String>> getLikedSongIds(@PathVariable UUID userId);

    @GetMapping("/reactions/{userId}/disliked")
    ApiResponse<List<String>> getDislikedSongIds(@PathVariable UUID userId);
}