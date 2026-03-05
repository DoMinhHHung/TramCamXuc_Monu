package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.ApiResponse;
import iuh.fit.se.musicservice.dto.request.AlbumCreateRequest;
import iuh.fit.se.musicservice.dto.request.AlbumUpdateRequest;
import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.service.AlbumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/albums")
@RequiredArgsConstructor
public class AlbumController {
    private final AlbumService albumService;

    @GetMapping("/{albumId}")
    public ApiResponse<AlbumResponse> getById(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder().result(albumService.getById(albumId)).build();
    }

    @PostMapping
    public ApiResponse<AlbumResponse> create(@RequestBody @Valid AlbumCreateRequest request) {
        return ApiResponse.<AlbumResponse>builder().result(albumService.create(request)).build();
    }

    @PatchMapping("/{albumId}")
    public ApiResponse<AlbumResponse> update(@PathVariable UUID albumId,
                                              @RequestBody @Valid AlbumUpdateRequest request) {
        return ApiResponse.<AlbumResponse>builder().result(albumService.update(albumId, request)).build();
    }
}
