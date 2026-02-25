package iuh.fit.se.social.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.social.dto.response.ShareResponse;
import iuh.fit.se.social.enums.TargetType;
import iuh.fit.se.social.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/share")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    /**
     * Lấy share link + QR Code.
     * Chỉ gọi cho PUBLIC playlist hoặc album đã APPROVED.
     * Frontend tự validate, backend chỉ generate link/QR.
     *
     * GET /social/share?targetId=...&targetType=PLAYLIST&slug=nhac-chill-abc12345
     */
    @GetMapping
    public ApiResponse<ShareResponse> getShareInfo(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType,
            @RequestParam String slug) {
        return ApiResponse.<ShareResponse>builder()
                .result(shareService.getShareInfo(targetId, targetType, slug))
                .build();
    }
}