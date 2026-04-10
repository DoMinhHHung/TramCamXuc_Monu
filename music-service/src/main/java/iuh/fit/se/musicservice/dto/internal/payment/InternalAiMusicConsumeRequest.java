package iuh.fit.se.musicservice.dto.internal.payment;

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
    private UUID userId;
    private String periodYm;
    private int durationSeconds;
}
