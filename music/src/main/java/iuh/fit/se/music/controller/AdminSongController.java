package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.SongApprovalRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.enums.ApprovalStatus;
import iuh.fit.se.music.service.SongService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/songs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSongController {

    private final SongService songService;

    @GetMapping
    public ApiResponse<Page<SongResponse>> getQueue(
            @RequestParam(required = false) ApprovalStatus approvalStatus,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<SongResponse>>builder()
                .result(songService.getAdminQueue(approvalStatus, keyword, pageable))
                .build();
    }

    @PatchMapping("/{songId}/approve")
    public ApiResponse<SongResponse> approveSong(@PathVariable UUID songId) {
        UUID adminId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return ApiResponse.<SongResponse>builder()
                .result(songService.approveSong(songId, adminId))
                .message("Song approved successfully.")
                .build();
    }

    @PatchMapping("/{songId}/reject")
    public ApiResponse<SongResponse> rejectSong(
            @PathVariable UUID songId,
            @RequestBody @Valid SongApprovalRequest request) {

        UUID adminId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return ApiResponse.<SongResponse>builder()
                .result(songService.rejectSong(songId, adminId, request))
                .message("Song rejected.")
                .build();
    }
}