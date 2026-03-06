package iuh.fit.se.socialservice.dto.response;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtistStatsResponse {
    private UUID artistId;
    private long followerCount;
    private long totalListens;
}
