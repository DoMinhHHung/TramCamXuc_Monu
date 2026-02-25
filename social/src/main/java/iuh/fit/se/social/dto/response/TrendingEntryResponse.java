package iuh.fit.se.social.dto.response;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingEntryResponse {
    private UUID targetId;
    private long score;
    private long rank;
}