package iuh.fit.se.social.dto.response;

import iuh.fit.se.social.enums.ReactionType;
import iuh.fit.se.social.enums.TargetType;
import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionStatsResponse {
    private UUID targetId;
    private TargetType targetType;
    private long likeCount;
    private long dislikeCount;
    private ReactionType myReaction;
}