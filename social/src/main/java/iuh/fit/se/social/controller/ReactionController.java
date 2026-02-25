package iuh.fit.se.social.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.social.dto.response.ReactionStatsResponse;
import iuh.fit.se.social.enums.ReactionType;
import iuh.fit.se.social.enums.TargetType;
import iuh.fit.se.social.service.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/reactions")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;

    /** GET stats của playlist hoặc album */
    @GetMapping
    public ApiResponse<ReactionStatsResponse> getStats(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType) {
        return ApiResponse.<ReactionStatsResponse>builder()
                .result(reactionService.getStats(targetId, targetType))
                .build();
    }

    /** LIKE hoặc DISLIKE một playlist/album */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ReactionStatsResponse> react(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType,
            @RequestParam ReactionType reactionType) {
        return ApiResponse.<ReactionStatsResponse>builder()
                .result(reactionService.react(targetId, targetType, reactionType))
                .build();
    }

    /** Xóa reaction (về trạng thái neutral) */
    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> removeReaction(
            @RequestParam UUID targetId,
            @RequestParam TargetType targetType) {
        reactionService.removeReaction(targetId, targetType);
        return ApiResponse.<Void>builder().message("Reaction removed.").build();
    }
}