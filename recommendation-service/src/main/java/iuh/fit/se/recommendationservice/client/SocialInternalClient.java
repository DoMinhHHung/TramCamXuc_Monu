package iuh.fit.se.recommendationservice.client;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.ListenHistoryItemDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "social-service", path = "/internal/social")
public interface SocialInternalClient {

    /**
     * Lịch sử nghe nhạc gần đây của user.
     * Dùng để: biết user đã nghe gì → loại trừ khỏi recommendation,
     *          và gửi sang Python ML làm input feature.
     *
     * @param days  lookback window (default 90 ngày — đủ dữ liệu mà không quá nặng)
     * @param limit max records (default 50 — đủ cho CF)
     */
    @GetMapping("/listen-history/{userId}")
    ApiResponse<List<ListenHistoryItemDto>> getListenHistory(
            @PathVariable("userId") UUID userId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "90") int days);

    /**
     * Danh sách artistId mà user đang follow.
     * Dùng cho: luồng "Songs from artists you follow"
     */
    @GetMapping("/follows/{userId}/artists")
    ApiResponse<List<String>> getFollowedArtistIds(@PathVariable("userId") UUID userId);

    /**
     * Danh sách userId mà user đang follow (user-to-user).
     * Dùng cho: luồng "Friends are listening"
     */
    @GetMapping("/follows/{userId}/users")
    ApiResponse<List<String>> getFollowedUserIds(@PathVariable("userId") UUID userId);

    /**
     * Danh sách songId mà user đã LIKE.
     * Dùng cho: content-based (user thích thể loại gì), social rec.
     */
    @GetMapping("/reactions/{userId}/liked")
    ApiResponse<List<String>> getLikedSongIds(@PathVariable("userId") UUID userId);

    /**
     * Danh sách songId mà user đã DISLIKE.
     * Dùng cho: filter — không bao giờ recommend bài bị dislike.
     */
    @GetMapping("/reactions/{userId}/disliked")
    ApiResponse<List<String>> getDislikedSongIds(@PathVariable("userId") UUID userId);
}