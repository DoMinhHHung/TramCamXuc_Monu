package iuh.fit.se.recommendationservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ListeningInsightsResponse {

    // ── Tổng quan ──────────────────────────────────────────────────────────

    private long totalListeningMinutesLast30Days;

    private long uniqueSongsLast30Days;

    private int currentStreakDays;

    private int longestStreakDays;

    // ── Top content ────────────────────────────────────────────────────────

    private List<GenreStat> topGenres;

    private List<ArtistStat> topArtists;

    private List<SongStat> mostPlayedSongs;

    // ── Patterns ───────────────────────────────────────────────────────────

    private List<HourlyListenCount> listeningByHour;
    private List<DailyListenCount> listeningByDayOfWeek;

    // ── Discovery ─────────────────────────────────────────────────────────

    private List<String> newlyDiscoveredArtistIds;

    private String dominantMoodLabel;

    // ── Nested DTOs ────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GenreStat {
        private String genreId;
        private String genreName;
        private long totalMinutes;
        private int percentageOfTotal;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ArtistStat {
        private String artistId;
        private String artistStageName;
        private String artistAvatarUrl;
        private long playCount;
        private long totalMinutes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SongStat {
        private String songId;
        private String title;
        private String thumbnailUrl;
        private String artistStageName;
        private long playCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HourlyListenCount {
        private int hour;
        private long count;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyListenCount {
        private int dayOfWeek;
        private String dayLabel;
        private long count;
    }
}