package iuh.fit.se.socialservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

public class FollowRequest {

    @Data
    public static class FollowArtist {
        @NotNull(message = "artistId is required")
        private UUID artistId;
    }
}
