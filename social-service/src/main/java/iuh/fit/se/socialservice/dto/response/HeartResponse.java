package iuh.fit.se.socialservice.dto.response;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeartResponse {
    private String id;
    private UUID userId;
    private UUID songId;
    private long totalHearts;
    private Instant createdAt;
}
