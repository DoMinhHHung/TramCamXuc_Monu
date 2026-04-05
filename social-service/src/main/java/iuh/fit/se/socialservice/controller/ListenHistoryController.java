package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;
import iuh.fit.se.socialservice.service.ListenHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/social/listen-history")
@RequiredArgsConstructor
public class ListenHistoryController {

    private final ListenHistoryService listenHistoryService;

    /** GET /social/listen-history/my — current user listen history */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<ListenHistoryResponse>>> myHistory(
            Authentication auth,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(ApiResponse.success(
                listenHistoryService.getUserHistory(userId, pageable)));
    }

    /** GET /social/listen-history/count/{songId} */
    @GetMapping("/count/{songId}")
    public ResponseEntity<ApiResponse<Long>> songListenCount(@PathVariable UUID songId) {
        return ResponseEntity.ok(ApiResponse.success(
                listenHistoryService.getSongListenCount(songId)));
    }
}
