package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.response.ShareResponse;
import iuh.fit.se.socialservice.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/share")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    /**
     * GET /social/share?songId=...&platform=facebook|twitter|telegram
     * Public endpoint — generate share link
     */
    @GetMapping
    public ResponseEntity<ApiResponse<ShareResponse>> shareLink(
            @RequestParam UUID songId,
            @RequestParam(defaultValue = "direct") String platform) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getShareLink(songId, platform)));
    }

    /**
     * GET /social/share/qr?songId=...
     * Public endpoint — generate QR code (base64 PNG)
     */
    @GetMapping("/qr")
    public ResponseEntity<ApiResponse<ShareResponse>> qrCode(@RequestParam UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getQrCode(songId)));
    }
}
