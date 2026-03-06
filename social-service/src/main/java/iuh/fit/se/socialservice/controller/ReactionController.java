package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.ReactionRequest;
import iuh.fit.se.socialservice.dto.response.ReactionResponse;
import iuh.fit.se.socialservice.enums.ReactionType;
import iuh.fit.se.socialservice.service.ReactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/social/reactions")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;

    /** GET /social/reactions?songId=... — public: summary for a song */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<ReactionType, Long>>> getReactionSummary(
            @RequestParam UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(reactionService.getSongReactionSummary(songId)));
    }

    /** POST /social/reactions — react to a song */
    @PostMapping
    public ResponseEntity<ApiResponse<ReactionResponse>> react(
            @Valid @RequestBody ReactionRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(
                reactionService.react(userId, req.getSongId(), req.getType())));
    }

    /** DELETE /social/reactions/{songId} — remove reaction */
    @DeleteMapping("/{songId}")
    public ResponseEntity<ApiResponse<Void>> removeReaction(
            @PathVariable UUID songId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        reactionService.removeReaction(userId, songId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code(1000).message("Reaction removed").build());
    }

    /** GET /social/reactions/my/{songId} — get current user reaction */
    @GetMapping("/my/{songId}")
    public ResponseEntity<ApiResponse<ReactionResponse>> myReaction(
            @PathVariable UUID songId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(reactionService.getUserReaction(userId, songId)));
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
