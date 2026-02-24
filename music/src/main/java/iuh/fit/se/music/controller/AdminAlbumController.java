package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.AlbumApprovalRequest;
import iuh.fit.se.music.dto.response.AlbumResponse;
import iuh.fit.se.music.enums.AlbumApprovalStatus;
import iuh.fit.se.music.service.AlbumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/albums")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAlbumController {

    private final AlbumService albumService;

    @GetMapping
    public ApiResponse<Page<AlbumResponse>> getQueue(
            @RequestParam(required = false) AlbumApprovalStatus approvalStatus,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.<Page<AlbumResponse>>builder()
                .result(albumService.getAdminQueue(approvalStatus, keyword,
                        PageRequest.of(page - 1, size,
                                Sort.by("createdAt").descending()))).build();
    }

    @GetMapping("/{albumId}")
    public ApiResponse<AlbumResponse> getDetail(@PathVariable UUID albumId) {
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.getAdminAlbumDetail(albumId)).build();
    }

    @PatchMapping("/{albumId}/approve")
    public ApiResponse<AlbumResponse> approveAlbum(@PathVariable UUID albumId) {
        UUID adminId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.approveAlbum(albumId, adminId))
                .message("Album approved.").build();
    }

    @PatchMapping("/{albumId}/reject")
    public ApiResponse<AlbumResponse> rejectAlbum(
            @PathVariable UUID albumId,
            @RequestBody @Valid AlbumApprovalRequest request) {
        UUID adminId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName());
        return ApiResponse.<AlbumResponse>builder()
                .result(albumService.rejectAlbum(albumId, adminId, request))
                .message("Album rejected.").build();
    }
}