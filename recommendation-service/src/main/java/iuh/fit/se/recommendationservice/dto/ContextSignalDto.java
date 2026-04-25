package iuh.fit.se.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ngữ cảnh của user tại thời điểm request recommendation.
 *
 * Client có thể gửi kèm hoặc backend auto-detect từ giờ hiện tại.
 * Giúp gợi ý "có cảm xúc": 22h → lofi/indie, sáng thứ 2 → nhạc năng lượng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContextSignalDto {

    /** Khung giờ — auto-detect từ server time nếu null */
    private TimeSlot timeSlot;

    /** Hoạt động hiện tại — client opt-in */
    private ActivityType activity;

    /** Tâm trạng hiện tại — client opt-in */
    private MoodType mood;

    public enum TimeSlot {
        EARLY_MORNING,  // 5-8h:  workout, năng lượng buổi sáng
        MORNING,        // 8-12h: focus, productive
        AFTERNOON,      // 12-17h: upbeat, varied
        EVENING,        // 17-20h: chill, R&B, indie
        NIGHT,          // 20-23h: ballad, emotional, acoustic
        LATE_NIGHT      // 23-5h:  lofi, ambient, deep house
    }

    public enum ActivityType {
        WORKING,
        EXERCISING,
        COMMUTING,
        RELAXING,
        STUDYING
    }

    public enum MoodType {
        HAPPY,
        SAD,
        STRESSED,
        FOCUSED,
        ROMANTIC,
        ENERGETIC
    }
}
