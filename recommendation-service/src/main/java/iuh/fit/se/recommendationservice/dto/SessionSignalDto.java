package iuh.fit.se.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Signal từ user trong session hiện tại.
 *
 * 5-10 hành động gần nhất quan trọng hơn lịch sử cả tháng:
 *   - Skip 3 EDM liên tiếp → đừng đẩy EDM trong session này
 *   - Nghe liên tục ballad → đẩy sâu hơn vào mood đó
 *   - Repeat 1 bài → super like tức thì
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionSignalDto {

    private String songId;
    private SignalType type;
    private List<String> genreIds;
    private String artistId;

    /** Số giây đã nghe — dùng để phân biệt SKIP_EARLY (< 10s) và SKIPPED */
    private Integer playedSeconds;

    public enum SignalType {
        PLAYED,       // nghe bình thường
        SKIPPED,      // bỏ qua (bất kỳ lúc nào)
        SKIP_EARLY,   // bỏ qua trong 10 giây đầu → dislike nhẹ
        REPEATED,     // nghe lại ngay lập tức → super like
        COMPLETED     // nghe hết bài
    }
}
