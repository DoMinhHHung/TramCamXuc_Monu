package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.ArtistRegisterRequest;
import iuh.fit.se.musicservice.dto.request.ArtistUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.ArtistResponse;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import iuh.fit.se.musicservice.service.ArtistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller cho Artist module.
 *
 * Routes:
 *   Public:
 *     GET  /artists                  – tìm kiếm nghệ sĩ
 *     GET  /artists/{id}             – chi tiết nghệ sĩ
 *
 *   Authenticated:
 *     POST /artists/register         – đăng ký làm nghệ sĩ
 *     GET  /artists/me               – profile của mình
 *     PUT  /artists/me               – cập nhật profile
 *
 *   Admin:
 *     PUT  /artists/{id}/status      – thay đổi trạng thái
 */
@RestController
@RequestMapping("/artists")
@RequiredArgsConstructor
public class ArtistController {

    private final ArtistService artistService;

    // ── Public ─────────────────────────────────────────────────────────────────

    @GetMapping
    public ApiResponse<Page<ArtistResponse>> searchArtists(
            @RequestParam(required = false) String stageName,
            @RequestParam(required = false) ArtistStatus status,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<ArtistResponse>>builder()
                .result(artistService.searchArtists(stageName, status,
                        PageRequest.of(page - 1, size, Sort.by("stageName").ascending())))
                .build();
    }

    @GetMapping("/{artistId}")
    public ApiResponse<ArtistResponse> getArtist(@PathVariable UUID artistId) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.getArtistById(artistId))
                .build();
    }

    /**
     * Lấy danh sách artists phổ biến (dựa vào số lượng bài hát).
     * Dùng cho onboarding screen.
     * GET /artists/popular?limit=10
     */
    @GetMapping("/popular")
    public ApiResponse<List<ArtistResponse>> getPopularArtists(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<List<ArtistResponse>>builder()
                .result(artistService.getPopularArtists(limit))
                .build();
    }

    // ── Authenticated ──────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ApiResponse<ArtistResponse> registerArtist(
            @Valid @RequestBody ArtistRegisterRequest request) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.registerArtist(request))
                .build();
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('ARTIST') or hasRole('ADMIN')")
    public ApiResponse<ArtistResponse> getMyProfile() {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.getMyProfile())
                .build();
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('ARTIST') or hasRole('ADMIN')")
    public ApiResponse<ArtistResponse> updateMyProfile(
            @Valid @RequestBody ArtistUpdateRequest request) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.updateMyProfile(request))
                .build();
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    @PutMapping("/{artistId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ArtistResponse> updateStatus(
            @PathVariable UUID artistId,
            @RequestParam ArtistStatus status) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.updateStatus(artistId, status))
                .build();
    }

    @GetMapping("/by-user/{userId}")
    public ApiResponse<ArtistResponse> getArtistByUserId(@PathVariable UUID userId) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.getArtistByUserId(userId))
                .build();
    }
}
