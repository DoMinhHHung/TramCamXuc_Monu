package iuh.fit.se.socialservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LikeDislikeRequest {

    @NotNull(message = "songId is required")
    private UUID songId;

    private UUID artistId;
}

