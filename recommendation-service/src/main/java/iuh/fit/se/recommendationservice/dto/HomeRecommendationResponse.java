package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

// ─── Home feed response ───────────────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HomeRecommendationResponse {
    /** Blended: CF + CB — personalized "For You" */
    private List<RecommendedSongDto> forYou;
    /** Redis ZSET top trending */
    private List<RecommendedSongDto> trendingNow;
    /** Songs mới nhất từ artists user follow */
    private List<RecommendedSongDto> fromArtists;
    /** Albums/singles mới publish (từ FeedContentEvent) */
    private List<RecommendedSongDto> newReleases;
    /** Songs bạn bè đang nghe/like */
    private List<RecommendedSongDto> friendsAreListening;
    /** IDs bài user nghe gần đây — client dùng để dedup UI */
    private List<String> recentlyPlayedIds;
}