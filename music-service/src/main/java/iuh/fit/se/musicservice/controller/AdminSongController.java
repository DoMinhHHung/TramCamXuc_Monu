package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.AdminSongBriefResponse;
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

import java.util.List;
import java.util.UUID;

/**
 * Admin quản lý bài hát:
 *  - Xem tất cả bài hát (kể cả DELETED)
 *  - Soft-delete khi xác nhận vi phạm
 *  - Restore bài hát bị xóa nhầm
 *
 * Không còn approve/reject bài hát nữa — bài hát tự PUBLIC sau khi transcode xong.
 */
@RestController
@RequestMapping("/admin/songs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSongController {

    private final SongService songService;

    /**
     * Lấy danh sách bài hát với filter linh hoạt.
     *
     * GET /admin/songs?keyword=&status=PUBLIC&showDeleted=false&page=1&size=20
     */
    @GetMapping
    public ApiResponse<Page<SongResponse>> getSongs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SongStatus status,
            @RequestParam(defaultValue = "false") boolean showDeleted,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String source) {

        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getAdminSongs(
                        keyword, status, showDeleted, source,
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    /**
     * Tra cứu nhanh theo danh sách id (dashboard + thống kê lượt nghe).
     *
     * POST /admin/songs/batch-lookup
     * Body: ["uuid1","uuid2",...]
     */
    @PostMapping("/batch-lookup")
    public ApiResponse<List<AdminSongBriefResponse>> batchLookup(@RequestBody List<UUID> songIds) {
        return ApiResponse.<List<AdminSongBriefResponse>>builder()
                .result(songService.adminBatchLookup(songIds))
                .build();
    }

    /**
     * Admin soft-delete bài hát vi phạm (thường gọi từ confirmReport,
     * nhưng admin có thể chủ động xóa mà không cần qua report flow).
     *
     * PATCH /admin/songs/{songId}/delete
     * Body: { "reason": "Nội dung vi phạm bản quyền" }
     */
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
     * PATCH /admin/songs/{songId}/restore
     */
    @PatchMapping("/{songId}/restore")
    public ApiResponse<SongResponse> restoreSong(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder()
                .result(songService.restoreSong(songId))
                .message("Song has been restored.")
                .build();
    }
}
