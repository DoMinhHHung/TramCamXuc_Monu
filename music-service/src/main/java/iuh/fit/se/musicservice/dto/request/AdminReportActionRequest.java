package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReportActionRequest {

    /** Ghi chú của admin khi xử lý report */
    @Size(max = 500)
    private String adminNote;

    /**
     * Chỉ dùng khi CONFIRM report (soft-delete song).
     * Lý do xóa sẽ được ghi vào song.deleteReason.
     */
    @Size(max = 1000)
    private String deleteReason;
}
