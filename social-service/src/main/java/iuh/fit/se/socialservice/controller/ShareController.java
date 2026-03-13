package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.FeedPostRequest;
import iuh.fit.se.socialservice.dto.response.FeedPostResponse;
import iuh.fit.se.socialservice.dto.response.ShareResponse;
import iuh.fit.se.socialservice.service.FeedService;
import iuh.fit.se.socialservice.service.ShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/share")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;
    private final FeedService feedService;

    @GetMapping
    public ResponseEntity<ApiResponse<ShareResponse>> shareLink(
            @RequestParam UUID songId,
            @RequestParam(defaultValue = "direct") String platform,
            Authentication auth) {
        UUID userId = tryExtractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(shareService.getShareLink(songId, platform, userId)));
    }

    @GetMapping("/qr")
    public ResponseEntity<ApiResponse<ShareResponse>> qrCode(
            @RequestParam UUID songId,
            Authentication auth) {
        UUID userId = tryExtractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(shareService.getQrCode(songId, userId)));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> shareCount(@RequestParam UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getShareCount(songId)));
    }

    @GetMapping("/playlist")
    public ResponseEntity<ApiResponse<ShareResponse>> playlistShareLink(
            @RequestParam UUID playlistId,
            @RequestParam(defaultValue = "direct") String platform) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getPlaylistShareLink(playlistId, platform)));
    }

    @GetMapping("/playlist/qr")
    public ResponseEntity<ApiResponse<ShareResponse>> playlistQr(
            @RequestParam UUID playlistId) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getPlaylistQrCode(playlistId)));
    }

    private UUID tryExtractUserId(Authentication auth) {
        try {
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(auth.getPrincipal())) {
                return UUID.fromString((String) auth.getPrincipal());
            }
        } catch (Exception ignored) {}
        return null;
    }

    @PostMapping("/feed")
    public ResponseEntity<ApiResponse<FeedPostResponse>> shareToFeed(
            @Valid @RequestBody FeedPostRequest req,
            Authentication auth) {
        UUID   userId    = extractUserId(auth);
        String ownerType = extractRole(auth);
        return ResponseEntity.ok(ApiResponse.success(
                feedService.createPost(userId, ownerType, req)));
    }

    private UUID   extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("USER");
    }
}
