package iuh.fit.se.recommendationservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.UUID;

/**
 * Một bài hát trong kết quả recommendation.
 *
 * Design decision:
 * - reasonType + reasonContext giải thích tại sao bài này được gợi ý
 *   → tăng trust của user, giảm churn ("ồ bạn mình đang nghe bài này")
 * - debugScore chỉ expose khi có query param ?debug=true (kiểm tra bởi controller)
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendedSongDto {

    private String  songId;
    private String  title;
    private String  slug;
    private String  thumbnailUrl;
    private Integer durationSeconds;
    private Long    playCount;
    private String  artistId;
    private String  artistStageName;
    private String  artistAvatarUrl;

    /** Lý do gợi ý hiển thị cho user */
    private ReasonType reason;

    /**
     * Context bổ sung phụ thuộc vào reason:
     *   FRIEND_LIKED      → "Nguyễn Văn A"  (tên bạn)
     *   ARTIST_YOU_FOLLOW → "Sơn Tùng M-TP" (tên artist)
     *   TRENDING_IN_GENRE → "Lo-fi"          (tên genre)
     *   NEW_RELEASE       → "Chúng Ta Của Hiện Tại (album)"
     */
    private String reasonContext;

    /** Chỉ trả về khi debug=true — không bao giờ expose production */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Double debugScore;

    public enum ReasonType {
        BECAUSE_YOU_LISTEN,
        FRIEND_LIKED,
        ARTIST_YOU_FOLLOW,
        NEW_RELEASE,
        TRENDING_NOW,
        TRENDING_IN_GENRE,
        SIMILAR_TO_LIKED,
        POPULAR_GLOBALLY
    }
}