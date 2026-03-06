package iuh.fit.se.socialservice.dto.response;

import iuh.fit.se.socialservice.enums.ReactionType;
import lombok.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionResponse {
    private String id;
    private UUID userId;
    private UUID songId;
    private ReactionType type;
    private Map<ReactionType, Long> summary;
    private Instant createdAt;
    private Instant updatedAt;
}
