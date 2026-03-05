package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/songs")
@RequiredArgsConstructor
public class AdminSongController {

    private final SongService songService;

    @DeleteMapping("/{songId}")
    public ApiResponse<Void> softDeleteReportedSong(
            @PathVariable UUID songId,
            Authentication authentication,
            @RequestHeader(value = "X-Admin-Id", required = false) String adminIdHeader
    ) {
        String adminId = adminIdHeader != null && !adminIdHeader.isBlank()
                ? adminIdHeader
                : (authentication != null ? authentication.getName() : "system");

        songService.softDeleteReportedSong(songId, adminId);

        return ApiResponse.<Void>builder()
                .message("Song soft deleted successfully")
                .build();
    }
}
