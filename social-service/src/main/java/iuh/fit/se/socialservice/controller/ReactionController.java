package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.request.LikeDislikeRequest;
import iuh.fit.se.socialservice.dto.response.ReactionResponse;
import iuh.fit.se.socialservice.dto.response.ReactionUserEntry;
import iuh.fit.se.socialservice.service.ReactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/reactions")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;

    // ── Public ────────────────────────────────────────────────────────────────

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ReactionResponse>> getSummary(@RequestParam UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(reactionService.getSongSummary(songId)));
    }


    @GetMapping("/likers")
    public ResponseEntity<ApiResponse<Page<ReactionUserEntry>>> getLikers(
            @RequestParam UUID songId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(reactionService.getLikers(songId, pageable)));
    }


    @GetMapping("/dislikers")
    public ResponseEntity<ApiResponse<Page<ReactionUserEntry>>> getDislikers(
            @RequestParam UUID songId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(reactionService.getDislikers(songId, pageable)));
    }


    @GetMapping("/my/{songId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReactionResponse>> myReaction(
            @PathVariable UUID songId,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        ReactionResponse response = reactionService.getUserReaction(userId, songId)
                .orElseGet(() -> reactionService.getSongSummary(songId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ── Authenticated ─────────────────────────────────────────────────────────


    @PostMapping("/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReactionResponse>> like(
            @Valid @RequestBody LikeDislikeRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(
                reactionService.like(userId, req.getSongId(), req.getArtistId())));
    }

    @PostMapping("/dislike")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReactionResponse>> dislike(
            @Valid @RequestBody LikeDislikeRequest req,
            Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(ApiResponse.success(
                reactionService.dislike(userId, req.getSongId(), req.getArtistId())));
    }

    @DeleteMapping("/{songId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> removeReaction(
            @PathVariable UUID songId,
            Authentication auth) {
        reactionService.removeReaction(extractUserId(auth), songId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000).message("Reaction removed").build());
    }

    private UUID extractUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
