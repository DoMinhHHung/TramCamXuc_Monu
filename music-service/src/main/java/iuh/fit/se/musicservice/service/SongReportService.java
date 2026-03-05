package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.AdminReportActionRequest;
import iuh.fit.se.musicservice.dto.request.SongReportRequest;
import iuh.fit.se.musicservice.dto.response.SongReportResponse;
import iuh.fit.se.musicservice.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SongReportService {

    SongReportResponse reportSong(UUID songId, SongReportRequest request);

    Page<SongReportResponse> getReports(ReportStatus status, UUID songId, Pageable pageable);

    SongReportResponse confirmReport(UUID reportId, AdminReportActionRequest request);

    SongReportResponse dismissReport(UUID reportId, AdminReportActionRequest request);
}