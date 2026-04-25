package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

// ─── Home feed response ───────────────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HomeRecommendationResponse {
    /** Blended: CF + CB — personalized "For You" (session-reranked) */
    private List<RecommendedSongDto> forYou;
    /** Redis ZSET top trending */
    private List<RecommendedSongDto> trendingNow;
    /** Songs mới nhất từ artists user follow */
    private List<RecommendedSongDto> fromArtists;
    /** Albums/singles mới publish (từ FeedContentEvent) */
    private List<RecommendedSongDto> newReleases;
    /** Songs bạn bè đang nghe/like */
    private List<RecommendedSongDto> friendsAreListening;
    /** Feature 1: Gợi ý theo ngữ cảnh thời gian/tâm trạng (22h → lofi, sáng thứ 2 → năng lượng) */
    private List<RecommendedSongDto> contextual;
    /** Feature 4: Social graph — người có gu giống bạn đang nghe gì */
    private List<RecommendedSongDto> crowdPicks;
    /** Feature 5: Discovery engine — 30% khám phá ngoài vùng quen thuộc */
    private List<RecommendedSongDto> discover;
    /** Label mô tả section contextual (vd: "Đêm - Cảm xúc 🌙") */
    private String contextualLabel;
    /** IDs bài user nghe gần đây — client dùng để dedup UI */
    private List<String> recentlyPlayedIds;
}