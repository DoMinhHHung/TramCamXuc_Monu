package iuh.fit.se.musicservice.dto.request;

import iuh.fit.se.musicservice.enums.ReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongReportRequest {

    @NotNull(message = "Report reason is required")
    private ReportReason reason;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
}