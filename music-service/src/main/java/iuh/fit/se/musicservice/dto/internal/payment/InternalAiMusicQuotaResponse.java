package iuh.fit.se.musicservice.dto.internal.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalAiMusicQuotaResponse {
    private boolean enabled;
    private String periodYm;
    private int maxGenerationsPerMonth;
    private int maxDurationSeconds;
    private int maxTotalMinutesPerMonth;
    private int usedGenerations;
    private int usedTotalSeconds;
    private int remainingGenerations;
    private int remainingTotalSeconds;
}
