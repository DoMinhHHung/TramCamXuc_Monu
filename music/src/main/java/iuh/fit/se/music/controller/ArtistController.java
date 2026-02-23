package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.ArtistRegisterRequest;
import iuh.fit.se.music.dto.request.ArtistUpdateRequest;
import iuh.fit.se.music.dto.response.ArtistResponse;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.service.ArtistService;
import iuh.fit.se.music.service.SongService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/artists")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ArtistController {

    ArtistService artistService;
    SongService songService;

    // ==================== USER ENDPOINTS ====================

    @PostMapping("/register")
    public ApiResponse<ArtistResponse> registerArtist(@RequestBody @Valid ArtistRegisterRequest request) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.registerArtist(request))
                .build();
    }

    @GetMapping("/my-profile")
    public ApiResponse<ArtistResponse> getMyProfile() {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.getMyProfile())
                .build();
    }

    @PutMapping("/profile")
    public ApiResponse<ArtistResponse> updateProfile(@RequestBody @Valid ArtistUpdateRequest request) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.updateProfile(request))
                .build();
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ArtistResponse> uploadAvatar(@RequestPart("file") MultipartFile file) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.uploadAvatar(file))
                .build();
    }

    @GetMapping("/{userId}")
    public ApiResponse<ArtistResponse> getArtistByUserId(@PathVariable UUID userId) {
        return ApiResponse.<ArtistResponse>builder()
                .result(artistService.getProfileByUserId(userId))
                .build();
    }

    @GetMapping("/{artistId}/songs")
    public ApiResponse<Page<SongResponse>> getSongsByArtist(
            @PathVariable UUID artistId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getSongsByArtist(artistId, pageable))
                .build();
    }

    // ==================== ADMIN ENDPOINTS ====================

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Page<ArtistResponse>> getArtistsForAdmin(
            @RequestParam(required = false) String stageName,
            @RequestParam(required = false) ArtistStatus status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<ArtistResponse>>builder()
                .result(artistService.getArtistsForAdmin(stageName, status, pageable))
                .build();
    }

    @PatchMapping("/admin/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> toggleArtistStatus(
            @PathVariable UUID id,
            @RequestParam ArtistStatus status) {
        artistService.toggleArtistStatus(id, status);
        return ApiResponse.<Void>builder()
                .message("Artist status updated successfully")
                .build();
    }
}