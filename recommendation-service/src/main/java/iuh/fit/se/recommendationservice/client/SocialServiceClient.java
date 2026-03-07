package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.ListenHistoryDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "social-service", path = "/api/v1")
public interface SocialServiceClient {

    /**
     * Lấy lịch sử nghe của user, sort by listenedAt DESC.
     * Mặc định 90 ngày gần nhất.
     */
    @GetMapping("/listen-history/{userId}")
    List<ListenHistoryDTO> getListenHistory(
            @PathVariable("userId") String userId,
            @RequestParam(defaultValue = "50")  int limit,
            @RequestParam(defaultValue = "90")  int days
    );

    /**
     * Lấy danh sách artistId mà user đang follow.
     */
    @GetMapping("/follows/{userId}/artists")
    List<String> getFollowedArtistIds(@PathVariable("userId") String userId);

    /**
     * Lấy danh sách userId mà user đang follow (cho collaborative filtering).
     */
    @GetMapping("/follows/{userId}/users")
    List<String> getFollowedUserIds(@PathVariable("userId") String userId);
}