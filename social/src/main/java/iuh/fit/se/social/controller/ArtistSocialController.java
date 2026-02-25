package iuh.fit.se.social.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.social.dto.response.ArtistSocialStatsResponse;
import iuh.fit.se.social.service.FollowService;
import iuh.fit.se.social.service.HeartService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/artists")
@RequiredArgsConstructor
public class ArtistSocialController {

    private final FollowService followService;
    private final HeartService heartService;

    /** Thống kê follow + heart của 1 artist */
    @GetMapping("/{artistId}/stats")
    public ApiResponse<ArtistSocialStatsResponse> getStats(@PathVariable UUID artistId) {
        return ApiResponse.<ArtistSocialStatsResponse>builder()
                .result(followService.getArtistStats(artistId))
                .build();
    }

    /** Toggle follow/unfollow artist */
    @PostMapping("/{artistId}/follow")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> toggleFollow(@PathVariable UUID artistId) {
        followService.toggleFollow(artistId);
        return ApiResponse.<Void>builder().message("Follow status updated.").build();
    }

    /** Toggle heart/un-heart artist */
    @PostMapping("/{artistId}/heart")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> toggleHeart(@PathVariable UUID artistId) {
        heartService.toggleHeart(artistId);
        return ApiResponse.<Void>builder().message("Heart status updated.").build();
    }
}