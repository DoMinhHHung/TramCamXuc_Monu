package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.response.GenreResponse;
import iuh.fit.se.musicservice.service.GenreService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/genres")
@RequiredArgsConstructor
public class GenreController {
    private final GenreService genreService;

    @GetMapping
    public ApiResponse<List<GenreResponse>> getAll() {
        return ApiResponse.<List<GenreResponse>>builder().result(genreService.getAll()).build();
    }
}
