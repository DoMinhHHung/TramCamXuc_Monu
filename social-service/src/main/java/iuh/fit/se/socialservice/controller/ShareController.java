package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.response.ShareResponse;
import iuh.fit.se.socialservice.service.ShareService;
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

    private UUID tryExtractUserId(Authentication auth) {
        try {
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(auth.getPrincipal())) {
                return UUID.fromString((String) auth.getPrincipal());
            }
        } catch (Exception ignored) {}
        return null;
    }
}
