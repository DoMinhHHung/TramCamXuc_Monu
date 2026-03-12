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
@RequestMapping("/genres")
@RequiredArgsConstructor
public class GenreController {

    private final GenreService genreService;

    // ===================== PUBLIC =====================

    /**
     * Lấy toàn bộ danh sách thể loại (dùng cho filter / dropdown trên UI).
     * GET /genres
     */
    @GetMapping
    public ApiResponse<List<GenreResponse>> getAllGenres() {
        return ApiResponse.<List<GenreResponse>>builder()
                .result(genreService.getAllGenres())
                .build();
    }

    /**
     * Lấy thông tin một thể loại theo ID.
     * GET /genres/{id}
     */
    @GetMapping("/{id}")
    public ApiResponse<GenreResponse> getGenreById(@PathVariable UUID id) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.getGenreById(id))
                .build();
    }

    /**
     * Lấy danh sách genres phổ biến (dựa vào số lượng bài hát).
     * Dùng cho onboarding screen.
     * GET /genres/popular?limit=10
     */
    @GetMapping("/popular")
    public ApiResponse<List<GenreResponse>> getPopularGenres(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<List<GenreResponse>>builder()
                .result(genreService.getPopularGenres(limit))
                .build();
    }

    // ===================== ADMIN =====================

    /**
     * Tạo thể loại mới.
     * POST /genres
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
     * PUT /genres/{id}
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
     * DELETE /genres/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteGenre(@PathVariable UUID id) {
        genreService.deleteGenre(id);
        return ApiResponse.<Void>builder().message("Genre deleted successfully.").build();
    }
}
