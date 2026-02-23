package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.response.GenreResponse;
import iuh.fit.se.music.service.GenreService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/genres")
@RequiredArgsConstructor
public class GenreController {

    private final GenreService genreService;

    @GetMapping
    public ApiResponse<List<GenreResponse>> getAllGenres() {
        return ApiResponse.<List<GenreResponse>>builder()
                .result(genreService.getAllGenres())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<GenreResponse> getGenreById(@PathVariable UUID id) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.getGenreById(id))
                .build();
    }
}