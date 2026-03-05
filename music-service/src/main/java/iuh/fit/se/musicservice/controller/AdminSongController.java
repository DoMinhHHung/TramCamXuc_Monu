package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/songs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSongController {

    private final SongService songService;

    @GetMapping
    public ApiResponse<Page<SongResponse>> getSongs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SongStatus status,
            @RequestParam(defaultValue = "false") boolean showDeleted,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getAdminSongs(
                        keyword, status, showDeleted,
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    @PatchMapping("/{songId}/delete")
    public ApiResponse<SongResponse> softDeleteSong(
            @PathVariable UUID songId,
            @RequestParam String reason) {

        return ApiResponse.<SongResponse>builder()
                .result(songService.softDeleteSong(songId, reason))
                .message("Song has been soft-deleted.")
                .build();
    }

    /**
     * Admin khôi phục bài hát bị xóa nhầm (chuyển về PRIVATE).
     *
     * PATCH /api/v1/admin/songs/{songId}/restore
     */
    @PatchMapping("/{songId}/restore")
    public ApiResponse<SongResponse> restoreSong(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.restoreSong(songId))
                .message("Song has been restored.")
                .build();
    }
}