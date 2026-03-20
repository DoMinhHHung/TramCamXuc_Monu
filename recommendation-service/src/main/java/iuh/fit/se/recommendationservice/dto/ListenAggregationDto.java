package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenAggregationDto {

    private long totalListeningSeconds;
    private long uniqueSongsCount;
    private int  currentStreakDays;
    private int  longestStreakDays;

    /** songId → số lần nghe */
    private List<SongPlayCount> topSongsByCount;

    /** artistId → tổng số giây nghe */
    private List<ArtistListenTime> topArtistsByDuration;

    /** genreId → tổng số giây nghe */
    private List<GenreListenTime> topGenresByDuration;

    /** 24 slot theo giờ */
    private List<Long> listenCountByHour;

    /** 7 slot theo thứ (0=Mon) */
    private List<Long> listenCountByDayOfWeek;

    /** Artist IDs user nghe lần đầu trong 7 ngày */
    private List<String> newlyDiscoveredArtistIds;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SongPlayCount {
        private String songId;
        private long   playCount;
        private long   totalDurationSeconds;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ArtistListenTime {
        private String artistId;
        private long   totalDurationSeconds;
        private long   playCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GenreListenTime {
        private String genreId;
        private String genreName;
        private long   totalDurationSeconds;
    }
}