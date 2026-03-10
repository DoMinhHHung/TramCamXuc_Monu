package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.AdminReportActionRequest;
import iuh.fit.se.musicservice.dto.request.SongReportRequest;
import iuh.fit.se.musicservice.dto.response.SongReportResponse;
import iuh.fit.se.musicservice.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SongReportService {

    /** User báo cáo bài hát */
    SongReportResponse reportSong(UUID songId, SongReportRequest request);

    /** Admin lấy danh sách report */
    Page<SongReportResponse> getReports(ReportStatus status, UUID songId, Pageable pageable);

    /** Admin xác nhận vi phạm → soft-delete bài hát + đóng tất cả pending report của bài hát đó */
    SongReportResponse confirmReport(UUID reportId, AdminReportActionRequest request);

    /** Admin bác bỏ report */
    SongReportResponse dismissReport(UUID reportId, AdminReportActionRequest request);
}
