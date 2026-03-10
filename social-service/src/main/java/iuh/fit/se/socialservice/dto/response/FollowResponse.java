package iuh.fit.se.socialservice.dto.response;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowResponse {
    private String id;
    private UUID followerId;
    private UUID artistId;
    private Instant createdAt;
}
