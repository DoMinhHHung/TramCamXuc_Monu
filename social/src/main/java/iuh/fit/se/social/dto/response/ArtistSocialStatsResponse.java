package iuh.fit.se.social.dto.response;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtistSocialStatsResponse {
    private UUID artistId;
    private long followerCount;
    private long heartCount;
    private boolean followedByMe;
    private boolean heartedByMe;
}