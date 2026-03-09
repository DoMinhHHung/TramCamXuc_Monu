package iuh.fit.se.recommendationservice.dto.ml;

import iuh.fit.se.recommendationservice.dto.ListenHistoryDto;
import iuh.fit.se.recommendationservice.dto.SongDto;
import iuh.fit.se.recommendationservice.dto.GenreDto;
import lombok.*;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlRecommendRequest {

    private String userId;
    private List<MlListenEvent> listenHistory;
    private List<String> followedArtistIds;
    private List<MlSongFeatures> candidateSongFeatures;
    private int limit;


    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MlListenEvent {
        private String songId;
        private String artistId;
        private int durationSeconds;
        private String listenedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MlSongFeatures {
        private String songId;
        private String artistId;
        private List<String> genreIds;
        private long playCount;
        private Integer durationSeconds;
    }

    // ── Factory method ────────────────────────────────────────────────

    public static MlRecommendRequest from(
            String userId,
            List<ListenHistoryDto> history,
            List<String> followedArtistIds,
            List<SongDto> candidates,
            int limit) {

        List<MlListenEvent> events = history.stream()
                .filter(h -> h.getSongId() != null)
                .map(h -> MlListenEvent.builder()
                        .songId(h.getSongId().toString())
                        .artistId(h.getArtistId() != null
                                ? h.getArtistId().toString() : null)
                        .durationSeconds(h.getDurationSeconds())
                        .listenedAt(h.getListenedAt() != null
                                ? h.getListenedAt().toString() : null)
                        .build())
                .collect(Collectors.toList());

        List<MlSongFeatures> features = candidates.stream()
                .map(s -> MlSongFeatures.builder()
                        .songId(s.getId().toString())
                        .artistId(s.getPrimaryArtist() != null
                                ? s.getPrimaryArtist().getArtistId().toString() : null)
                        .genreIds(s.getGenres() != null
                                ? s.getGenres().stream()
                                .map(g -> g.getId().toString())
                                .collect(Collectors.toList())
                                : List.of())
                        .playCount(s.getPlayCount() != null ? s.getPlayCount() : 0L)
                        .durationSeconds(s.getDurationSeconds())
                        .build())
                .collect(Collectors.toList());

        return MlRecommendRequest.builder()
                .userId(userId)
                .listenHistory(events)
                .followedArtistIds(followedArtistIds)
                .candidateSongFeatures(features)
                .limit(limit)
                .build();
    }
}