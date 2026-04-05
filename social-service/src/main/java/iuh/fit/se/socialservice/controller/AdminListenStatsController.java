package iuh.fit.se.socialservice.controller;

import iuh.fit.se.socialservice.dto.ApiResponse;
import iuh.fit.se.socialservice.dto.response.TopSongListenEntry;
import iuh.fit.se.socialservice.service.ListenPeriod;
import iuh.fit.se.socialservice.service.ListenStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/social/admin/listen")
@RequiredArgsConstructor
public class AdminListenStatsController {

    private final ListenStatsService listenStatsService;

    /**
     * Top bài hát theo lượt nghe (Mongo listen_history).
     *
     * GET /social/admin/listen/top-songs?period=DAY|WEEK|MONTH&limit=50
     */
    @GetMapping("/top-songs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TopSongListenEntry>>> topSongs(
            @RequestParam(defaultValue = "DAY") ListenPeriod period,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                listenStatsService.topSongs(period, limit)));
    }
}
