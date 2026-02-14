package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.GenreRequest;
import iuh.fit.se.music.dto.response.GenreResponse;
import iuh.fit.se.music.service.GenreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/admin/genres")
@RequiredArgsConstructor
public class AdminGenreController {

    private final GenreService genreService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<GenreResponse> createGenre(
            @RequestBody @Valid GenreRequest request) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.createGenre(request))
                .build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<GenreResponse> updateGenre(
            @PathVariable UUID id,
            @RequestBody @Valid GenreRequest request) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.updateGenre(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteGenre(@PathVariable UUID id) {
        genreService.deleteGenre(id);
        return ApiResponse.<Void>builder()
                .message("Genre deleted successfully")
                .build();
    }
}