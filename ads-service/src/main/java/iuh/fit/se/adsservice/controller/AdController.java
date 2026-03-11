package iuh.fit.se.adsservice.controller;

import iuh.fit.se.adsservice.dto.request.RecordPlayedRequest;
import iuh.fit.se.adsservice.dto.response.AdDeliveryResponse;
import iuh.fit.se.adsservice.service.AdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/ads")
@RequiredArgsConstructor
@Tag(name = "Ads - User", description = "User-facing ad delivery & tracking")
public class AdController {

    private final AdService adService;

    /**
     * GET /ads/next
     * Returns the next ad to play, or 204 if no ad is due.
     * The client should call this after every song.
     */
    @GetMapping("/next")
    @Operation(summary = "Get next ad for current user (null = no ad due)")
    public ResponseEntity<AdDeliveryResponse> getNextAd(Authentication auth) {
        UUID userId = extractUserId(auth);
        AdDeliveryResponse ad = adService.getNextAd(userId);
        if (ad == null) {
            return ResponseEntity.noContent().build(); // 204
        }
        return ResponseEntity.ok(ad);
    }

    /**
     * POST /ads/{adId}/played
     * Called by the client when the ad finishes playing (or is skipped if skip is allowed).
     */
    @PostMapping("/{adId}/played")
    @Operation(summary = "Record that the user played an ad")
    public ResponseEntity<Void> recordPlayed(
            @PathVariable UUID adId,
            @RequestBody(required = false) RecordPlayedRequest body,
            Authentication auth) {
        UUID userId    = extractUserId(auth);
        UUID songId    = body != null ? body.getSongId() : null;
        boolean completed = body == null || body.isCompleted();
        adService.recordPlayed(adId, userId, songId, completed);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /ads/{adId}/clicked
     * Called by the client when the user taps the ad banner / CTA button.
     * Anti-spam: max 3 clicks per minute per user.
     */
    @PostMapping("/{adId}/clicked")
    @Operation(summary = "Record that the user clicked an ad")
    public ResponseEntity<Void> recordClicked(
            @PathVariable UUID adId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        adService.recordClicked(adId, userId);
        return ResponseEntity.ok().build();
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
