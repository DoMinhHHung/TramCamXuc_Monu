package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.service.AlbumService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin: album mới phát hành, album được yêu thích nhiều trong tuần.
 */
@RestController
@RequestMapping("/admin/albums")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAlbumController {

    private final AlbumService albumService;

    /**
     * GET /admin/albums/recently-published?withinDays=7&page=1&size=20
     */
    @GetMapping("/recently-published")
    public ApiResponse<Page<AlbumResponse>> recentlyPublished(
            @RequestParam(defaultValue = "7") int withinDays,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<Page<AlbumResponse>>builder()
                .result(albumService.adminRecentlyPublishedAlbums(
                        PageRequest.of(page - 1, size, Sort.by("publishedAt").descending()),
                        withinDays))
                .build();
    }

    /**
     * GET /admin/albums/top-favorites-week?limit=20
     */
    @GetMapping("/top-favorites-week")
    public ApiResponse<List<AlbumResponse>> topFavoritesWeek(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.<List<AlbumResponse>>builder()
                .result(albumService.adminTopFavoritedAlbumsThisWeek(limit))
                .build();
    }

    /**
     * GET /admin/albums/top-favorites-month?limit=20
     */
    @GetMapping("/top-favorites-month")
    public ApiResponse<List<AlbumResponse>> topFavoritesMonth(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.<List<AlbumResponse>>builder()
                .result(albumService.adminTopFavoritedAlbumsThisMonth(limit))
                .build();
    }
}
