package iuh.fit.se.musicservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMusicQuotaResponse {
    private Integer remaining;
    private Integer limit;
    private String resetAt;
}
