package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.service.impl.JamendoImportServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin-only HTTP endpoint to trigger a Jamendo import run.
 *
 * POST /admin/jamendo/import
 *   ?tags=pop              – Jamendo genre tag filter (optional)
 *   ?limit=500             – max tracks to enqueue (default 500)
 *
 * Returns HTTP 200 immediately with counts of fetched / skipped / enqueued tracks.
 * Actual downloads and transcoding happen asynchronously in the background.
 */
@RestController
@RequestMapping("/admin/jamendo")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class JamendoImportController {

    private final JamendoImportServiceImpl jamendoImportService;

    /**
     * Triggers an async Jamendo import.
     *
     * @param tags  Optional Jamendo genre tag filter, e.g. "pop", "rock", "lofi".
     *              Multiple tags can be comma-separated as Jamendo supports it.
     * @param limit Maximum number of NEW tracks to enqueue. Default = 500.
     * @return Summary of the import run (fetched / skipped / enqueued).
     */
    @PostMapping("/import")
    public ApiResponse<Map<String, Integer>> importTracks(
            @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "500") int limit) {

        Map<String, Integer> summary = jamendoImportService.importTracks(tags, limit);
        return ApiResponse.<Map<String, Integer>>builder()
                .result(summary)
                .message(String.format(
                        "Import job submitted. %d tracks enqueued for async download.",
                        summary.getOrDefault("enqueued", 0)))
                .build();
    }
}