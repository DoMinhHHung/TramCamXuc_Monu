package iuh.fit.se.adsservice.controller;

import iuh.fit.se.adsservice.dto.request.RecordPlayedRequest;
import iuh.fit.se.adsservice.dto.response.AdDeliveryResponse;
import iuh.fit.se.adsservice.exception.AppException;
import iuh.fit.se.adsservice.exception.ErrorCode;
import iuh.fit.se.adsservice.service.AdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/ads")
@RequiredArgsConstructor
@Tag(name = "Ads - User", description = "User-facing ad delivery & tracking")
public class AdController {

    private final AdService adService;

    @GetMapping("/next")
    @Operation(summary = "Get next ad for current user (null = no ad due)")
    public ResponseEntity<AdDeliveryResponse> getNextAd(Authentication auth) {
        UUID userId = extractUserId(auth);
        AdDeliveryResponse ad = adService.getNextAd(userId);
        if (ad == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ad);
    }

    @PostMapping("/{adId}/played")
    @Operation(summary = "Record that the user played an ad")
    public ResponseEntity<Void> recordPlayed(
            @PathVariable UUID adId,
            @RequestBody(required = false) RecordPlayedRequest body,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        UUID songId = body != null ? body.getSongId() : null;
        boolean completed = body == null || body.isCompleted();
        adService.recordPlayed(adId, userId, songId, completed);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{adId}/clicked")
    @Operation(summary = "Record that the user clicked an ad")
    public ResponseEntity<?> recordClicked(@PathVariable UUID adId, Authentication auth) {
        UUID userId = extractUserId(auth);
        try {
            adService.recordClicked(adId, userId);
            return ResponseEntity.ok().build();
        } catch (AppException e) {
            if (e.getErrorCode() == ErrorCode.AD_CLICK_SPAM) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("message", "Too many clicks"));
            }
            throw e;
        }
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}
