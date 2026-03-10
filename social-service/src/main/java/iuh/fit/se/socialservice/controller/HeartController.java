package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.HeartRequest;
import iuh.fit.se.socialservice.dto.response.HeartResponse;
import iuh.fit.se.socialservice.service.HeartService;
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
@RequestMapping("/social/hearts")
@RequiredArgsConstructor
public class HeartController {

    private final HeartService heartService;

    /** POST /social/hearts — heart a song */
    @PostMapping
    public ResponseEntity<ApiResponse<HeartResponse>> heart(
            @Valid @RequestBody HeartRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(heartService.heartSong(userId, req.getSongId())));
    }

    /** DELETE /social/hearts/{songId} — unheart */
    @DeleteMapping("/{songId}")
    public ResponseEntity<ApiResponse<Void>> unheart(
            @PathVariable UUID songId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        heartService.unheartSong(userId, songId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code(1000).message("Unhearted").build());
    }

    /** GET /social/hearts/check/{songId} */
    @GetMapping("/check/{songId}")
    public ResponseEntity<ApiResponse<Boolean>> isHearted(
            @PathVariable UUID songId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(heartService.isHearted(userId, songId)));
    }

    /** GET /social/hearts/count/{songId} */
    @GetMapping("/count/{songId}")
    public ResponseEntity<ApiResponse<Long>> heartCount(@PathVariable UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(heartService.getHeartCount(songId)));
    }

    /** GET /social/hearts/my — songs hearted by current user */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<HeartResponse>>> myHearts(
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(heartService.getUserHearts(userId, pageable)));
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
