package iuh.fit.se.socialservice.dto.response;

import iuh.fit.se.socialservice.enums.ReactionType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionUserEntry {
    private UUID        userId;
    private ReactionType type;
    private Instant     reactedAt;
}

