package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.request.SongCreateRequest;
import iuh.fit.se.musicservice.dto.request.SongUpdateRequest;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.SongService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/songs")
@RequiredArgsConstructor
public class SongController {
    private final SongService songService;

    @GetMapping
    public ApiResponse<Page<SongResponse>> getPublicSongs(Pageable pageable) {
        return ApiResponse.<Page<SongResponse>>builder().result(songService.getPublicSongs(pageable)).build();
    }

    @GetMapping("/{songId}")
    public ApiResponse<SongResponse> getById(@PathVariable UUID songId) {
        return ApiResponse.<SongResponse>builder().result(songService.getById(songId)).build();
    }

    @PostMapping
    public ApiResponse<SongResponse> create(@RequestBody @Valid SongCreateRequest request) {
        return ApiResponse.<SongResponse>builder().result(songService.create(request)).build();
    }

    @PatchMapping("/{songId}")
    public ApiResponse<SongResponse> update(@PathVariable UUID songId,
                                            @RequestBody @Valid SongUpdateRequest request) {
        return ApiResponse.<SongResponse>builder().result(songService.update(songId, request)).build();
    }
}
