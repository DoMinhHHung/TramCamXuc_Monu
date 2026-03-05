package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReportActionRequest {

    @Size(max = 500)
    private String adminNote;

    @Size(max = 1000)
    private String deleteReason;
}