package iuh.fit.se.paymentservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalAiMusicConsumeRequest {

    @NotNull
    private UUID userId;

    @NotBlank
    private String periodYm;

    /**
     * Độ dài audio đã sinh (giây), dùng cho thống kê phút/tháng.
     */
    @PositiveOrZero
    private int durationSeconds;
}
