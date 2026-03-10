package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.ReportReason;
import iuh.fit.se.musicservice.enums.ReportStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongReportResponse {
    private UUID id;
    private UUID songId;
    private String songTitle;
    private UUID reporterId;
    private ReportReason reason;
    private String description;
    private ReportStatus status;
    private UUID reviewedBy;
    private LocalDateTime reviewedAt;
    private String adminNote;
    private LocalDateTime createdAt;
}
