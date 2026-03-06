package iuh.fit.se.socialservice.controller;

import io.jsonwebtoken.Claims;
import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.FollowRequest;
import iuh.fit.se.socialservice.dto.response.ArtistStatsResponse;
import iuh.fit.se.socialservice.dto.response.FollowResponse;
import iuh.fit.se.socialservice.service.FollowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    /** GET /social/artists/{artistId}/stats — public */
    @GetMapping("/artists/{artistId}/stats")
    public ResponseEntity<ApiResponse<ArtistStatsResponse>> getArtistStats(
            @PathVariable UUID artistId) {
        return ResponseEntity.ok(ApiResponse.success(followService.getArtistStats(artistId)));
    }

    /** POST /social/follows — follow an artist */
    @PostMapping("/follows")
    public ResponseEntity<ApiResponse<FollowResponse>> follow(
            @Valid @RequestBody FollowRequest.FollowArtist req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(followService.followArtist(userId, req.getArtistId())));
    }

    /** DELETE /social/follows/{artistId} — unfollow */
    @DeleteMapping("/follows/{artistId}")
    public ResponseEntity<ApiResponse<Void>> unfollow(
            @PathVariable UUID artistId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        followService.unfollowArtist(userId, artistId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code(1000).message("Unfollowed").build());
    }

    /** GET /social/follows/check/{artistId} — check if following */
    @GetMapping("/follows/check/{artistId}")
    public ResponseEntity<ApiResponse<Boolean>> isFollowing(
            @PathVariable UUID artistId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(followService.isFollowing(userId, artistId)));
    }

    /** GET /social/follows/my-artists — list artists the current user follows */
    @GetMapping("/follows/my-artists")
    public ResponseEntity<ApiResponse<Page<FollowResponse>>> myFollowedArtists(
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(followService.getFollowedArtists(userId, pageable)));
    }

    /** GET /social/artists/{artistId}/followers */
    @GetMapping("/artists/{artistId}/followers")
    public ResponseEntity<ApiResponse<Page<FollowResponse>>> artistFollowers(
            @PathVariable UUID artistId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(followService.getArtistFollowers(artistId, pageable)));
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
