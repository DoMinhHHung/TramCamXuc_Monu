package iuh.fit.se.socialservice.dto.request;

import iuh.fit.se.socialservice.enums.ReactionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ReactionRequest {
    @NotNull(message = "songId is required")
    private UUID songId;

    @NotNull(message = "type is required")
    private ReactionType type;
}
