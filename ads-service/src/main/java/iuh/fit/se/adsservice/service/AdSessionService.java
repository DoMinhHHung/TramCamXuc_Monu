package iuh.fit.se.adsservice.service;

import java.util.UUID;

/**
 * Tracks per-user ad eligibility state in Redis.
 *
 * Key: ads:session:{userId}
 * Value: hash với 2 field:
 *   - songCount      : số bài đã nghe trong session hiện tại
 *   - listenedSeconds: tổng giây nghe THỰC TẾ (cộng dồn duration từng bài)
 *
 * Rules:
 *  - Sau 5 bài nghe                → hiện quảng cáo
 *  - Sau 1800 giây nghe (30 phút)  → hiện quảng cáo
 *  - Chỉ tính thời gian có music đang phát, không tính idle
 *  - Ad đã hiện → reset session
 *  - Premium user → skip (caller's responsibility)
 */
public interface AdSessionService {

    /**
     * Ghi nhận user vừa nghe xong 1 bài với thời lượng {@code durationSeconds}.
     * Cộng dồn cả songCount lẫn listenedSeconds vào Redis.
     *
     * @return true nếu đã đến lúc hiện quảng cáo
     */
    boolean onSongListened(UUID userId, int durationSeconds);

    /** Reset session sau khi đã serve ad. */
    void resetSession(UUID userId);

    /** Kiểm tra eligibility không thay đổi state (dùng trong getNextAd). */
    boolean isAdDue(UUID userId);
}
