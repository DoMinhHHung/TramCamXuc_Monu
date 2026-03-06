package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.GenreRequest;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.GenreResponse;
import iuh.fit.se.musicservice.service.GenreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/genres")
@RequiredArgsConstructor
public class GenreController {

    private final GenreService genreService;

    // ===================== PUBLIC =====================

    /**
     * Lấy toàn bộ danh sách thể loại (dùng cho filter / dropdown trên UI).
     * GET /api/v1/genres
     */
    @GetMapping
    public ApiResponse<List<GenreResponse>> getAllGenres() {
        return ApiResponse.<List<GenreResponse>>builder()
                .result(genreService.getAllGenres())
                .build();
    }

    /**
     * Lấy thông tin một thể loại theo ID.
     * GET /api/v1/genres/{id}
     */
    @GetMapping("/{id}")
    public ApiResponse<GenreResponse> getGenreById(@PathVariable UUID id) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.getGenreById(id))
                .build();
    }

    // ===================== ADMIN =====================

    /**
     * Tạo thể loại mới.
     * POST /api/v1/genres
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<GenreResponse> createGenre(@RequestBody @Valid GenreRequest request) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.createGenre(request))
                .build();
    }

    /**
     * Cập nhật thể loại.
     * PUT /api/v1/genres/{id}
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<GenreResponse> updateGenre(
            @PathVariable UUID id,
            @RequestBody @Valid GenreRequest request) {

        return ApiResponse.<GenreResponse>builder()
                .result(genreService.updateGenre(id, request))
                .build();
    }

    /**
     * Xóa thể loại (chỉ khi không còn bài hát nào sử dụng).
     * DELETE /api/v1/genres/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteGenre(@PathVariable UUID id) {
        genreService.deleteGenre(id);
        return ApiResponse.<Void>builder().message("Genre deleted successfully.").build();
    }
}
