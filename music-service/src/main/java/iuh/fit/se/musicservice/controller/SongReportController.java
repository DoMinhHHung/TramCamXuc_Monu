package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.AdminReportActionRequest;
import iuh.fit.se.musicservice.dto.request.SongReportRequest;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongReportResponse;
import iuh.fit.se.musicservice.enums.ReportStatus;
import iuh.fit.se.musicservice.service.SongReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SongReportController {

    private final SongReportService songReportService;

    // ===================== USER =====================

    /**
     * User (hoặc khách vãng lai) báo cáo bài hát vi phạm.
     *
     * POST /api/v1/songs/{songId}/report
     * Body: { "reason": "COPYRIGHT_VIOLATION", "description": "..." }
     *
     * Mỗi user chỉ được gửi 1 PENDING report cho cùng 1 bài hát.
     * Nếu chưa đăng nhập thì reporterId = null (anonymous report).
     */
    @PostMapping("/songs/{songId}/report")
    public ApiResponse<SongReportResponse> reportSong(
            @PathVariable UUID songId,
            @RequestBody @Valid SongReportRequest request) {

        return ApiResponse.<SongReportResponse>builder()
                .result(songReportService.reportSong(songId, request))
                .message("Report submitted. Thank you for your feedback.")
                .build();
    }

    // ===================== ADMIN =====================

    /**
     * Admin lấy danh sách report với filter.
     *
     * GET /api/v1/admin/reports?status=PENDING&songId=&page=1&size=20
     */
    @GetMapping("/admin/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Page<SongReportResponse>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) UUID songId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ApiResponse.<Page<SongReportResponse>>builder()
                .result(songReportService.getReports(
                        status, songId,
                        PageRequest.of(page - 1, size, Sort.by("createdAt").descending())))
                .build();
    }

    /**
     * Admin xác nhận vi phạm:
     *  → Soft-delete bài hát
     *  → Đóng TẤT CẢ pending report của bài hát đó (status = CONFIRMED)
     *
     * PATCH /api/v1/admin/reports/{reportId}/confirm
     * Body: { "adminNote": "...", "deleteReason": "..." }
     */
    @PatchMapping("/admin/reports/{reportId}/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SongReportResponse> confirmReport(
            @PathVariable UUID reportId,
            @RequestBody @Valid AdminReportActionRequest request) {

        return ApiResponse.<SongReportResponse>builder()
                .result(songReportService.confirmReport(reportId, request))
                .message("Report confirmed. Song has been removed.")
                .build();
    }

    /**
     * Admin bác bỏ report — bài hát vẫn PUBLIC bình thường.
     *
     * PATCH /api/v1/admin/reports/{reportId}/dismiss
     * Body: { "adminNote": "Không đủ bằng chứng vi phạm" }
     */
    @PatchMapping("/admin/reports/{reportId}/dismiss")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SongReportResponse> dismissReport(
            @PathVariable UUID reportId,
            @RequestBody @Valid AdminReportActionRequest request) {

        return ApiResponse.<SongReportResponse>builder()
                .result(songReportService.dismissReport(reportId, request))
                .message("Report dismissed.")
                .build();
    }
}
