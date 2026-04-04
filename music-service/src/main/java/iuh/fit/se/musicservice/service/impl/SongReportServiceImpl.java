package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.request.AdminReportActionRequest;
import iuh.fit.se.musicservice.dto.request.SongReportRequest;
import iuh.fit.se.musicservice.dto.response.SongReportResponse;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.entity.SongReport;
import iuh.fit.se.musicservice.enums.ReportStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.SongReportRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.service.SongReportService;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SongReportServiceImpl implements SongReportService {

    private final SongReportRepository reportRepository;
    private final SongRepository songRepository;
    private final SongService songService;   // dùng softDeleteSong

    private UUID currentUserId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || "anonymousUser".equals(auth.getPrincipal())) return null;
            return UUID.fromString(auth.getName());
        } catch (Exception e) {
            return null;
        }
    }

    private SongReportResponse toResponse(SongReport report, String songTitle) {
        return SongReportResponse.builder()
                .id(report.getId())
                .songId(report.getSongId())
                .songTitle(songTitle)
                .reporterId(report.getReporterId())
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .reviewedBy(report.getReviewedBy())
                .reviewedAt(report.getReviewedAt())
                .adminNote(report.getAdminNote())
                .createdAt(report.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public SongReportResponse reportSong(UUID songId, SongReportRequest request) {
        // Bài hát phải tồn tại và công khai
        Song song = songRepository.findPublicById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.SONG_NOT_FOUND));

        UUID reporterId = currentUserId();

        if (reporterId != null && reportRepository.existsBySongIdAndReporterId(songId, reporterId)) {
            throw new AppException(ErrorCode.REPORT_ALREADY_SENT);
        }

        SongReport report = SongReport.builder()
                .songId(songId)
                .reporterId(reporterId)
                .reason(request.getReason())
                .description(request.getDescription())
                .status(ReportStatus.PENDING)
                .build();

        try {
            report = reportRepository.save(report);
        } catch (DataIntegrityViolationException ex) {
            throw new AppException(ErrorCode.REPORT_ALREADY_SENT);
        }

        log.info("Song {} reported by user {} – reason: {}", songId, reporterId, request.getReason());
        return toResponse(report, song.getTitle());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SongReportResponse> getMyReports(Pageable pageable) {
        UUID reporterId = currentUserId();
        if (reporterId == null) {
            return Page.empty(pageable);
        }

        return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId, pageable)
                .map(r -> {
                    String title = songRepository.findById(r.getSongId())
                            .map(Song::getTitle).orElse("Unknown");
                    return toResponse(r, title);
                });
    }

    @Override
    @Transactional
    public void removeMyReport(UUID reportId) {
        UUID reporterId = currentUserId();
        if (reporterId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        SongReport report = reportRepository.findByIdAndReporterId(reportId, reporterId)
                .orElseThrow(() -> new AppException(ErrorCode.REPORT_NOT_FOUND));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new AppException(ErrorCode.REPORT_ALREADY_HANDLED);
        }

        reportRepository.delete(report);
        log.info("User {} removed pending report {}", reporterId, reportId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SongReportResponse> getReports(ReportStatus status, UUID songId, Pageable pageable) {
        return reportRepository.findForAdmin(status, songId, pageable)
                .map(r -> {
                    String title = songRepository.findById(r.getSongId())
                            .map(Song::getTitle).orElse("Unknown");
                    return toResponse(r, title);
                });
    }

    @Override
    @Transactional
    public SongReportResponse confirmReport(UUID reportId, AdminReportActionRequest request) {
        UUID adminId = currentUserId();

        SongReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new AppException(ErrorCode.REPORT_NOT_FOUND));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new AppException(ErrorCode.REPORT_ALREADY_HANDLED);
        }

        // 1. Soft-delete bài hát vi phạm
        String deleteReason = request.getDeleteReason() != null
                ? request.getDeleteReason()
                : "Confirmed violation via report " + reportId;
        songService.softDeleteSong(report.getSongId(), deleteReason);

        // 2. Đóng TẤT CẢ report PENDING của bài hát này
        Page<SongReport> pendingReports = reportRepository
                .findForAdmin(ReportStatus.PENDING, report.getSongId(), Pageable.unpaged());
        pendingReports.forEach(r -> {
            r.setStatus(ReportStatus.CONFIRMED);
            r.setReviewedBy(adminId);
            r.setReviewedAt(LocalDateTime.now());
            r.setAdminNote("Auto-closed: violation confirmed via report " + reportId);
            reportRepository.save(r);
        });

        // 3. Cập nhật report gốc
        report.setStatus(ReportStatus.CONFIRMED);
        report.setReviewedBy(adminId);
        report.setReviewedAt(LocalDateTime.now());
        report.setAdminNote(request.getAdminNote());
        report = reportRepository.save(report);

        log.info("Admin {} confirmed report {} – song {} soft-deleted", adminId, reportId, report.getSongId());

        String title = songRepository.findById(report.getSongId())
                .map(Song::getTitle).orElse("Unknown");
        return toResponse(report, title);
    }

    @Override
    @Transactional
    public SongReportResponse dismissReport(UUID reportId, AdminReportActionRequest request) {
        UUID adminId = currentUserId();

        SongReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new AppException(ErrorCode.REPORT_NOT_FOUND));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new AppException(ErrorCode.REPORT_ALREADY_HANDLED);
        }

        report.setStatus(ReportStatus.DISMISSED);
        report.setReviewedBy(adminId);
        report.setReviewedAt(LocalDateTime.now());
        report.setAdminNote(request.getAdminNote());
        report = reportRepository.save(report);

        log.info("Admin {} dismissed report {}", adminId, reportId);

        String title = songRepository.findById(report.getSongId())
                .map(Song::getTitle).orElse("Unknown");
        return toResponse(report, title);
    }
}
