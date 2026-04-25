package iuh.fit.se.recommendationservice.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Deserialized từ social.engagement.fanout.exchange messages.
 * Published bởi social-service khi user like/dislike/heart/comment/share.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EngagementEventDto {

    private String songId;
    private String userId;
    private String artistId;

    /**
     * LIKE | UN_LIKE | DISLIKE | UN_DISLIKE | HEART | UN_HEART | COMMENT | SHARE
     */
    private String type;

    private String occurredAt;
}
