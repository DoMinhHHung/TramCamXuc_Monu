package iuh.fit.se.recommendationservice.engine;

import iuh.fit.se.recommendationservice.client.MusicServiceClient;
import iuh.fit.se.recommendationservice.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class RuleBasedEngine {

    private final MusicServiceClient musicServiceClient;
    private final ScoringEngine      scoringEngine;


    public List<SongScoreDto> recommend(UserProfileDto profile, int limit) {
        List<SongScoreDto> candidates = new ArrayList<>();

        // Rule 1: Songs từ artist user đang follow
        candidates.addAll(songsFromFollowedArtists(profile));

        // Rule 2: Songs theo top genre affinity
        candidates.addAll(songsFromTopGenres(profile));

        // Rule 3: Trending (luôn có — kể cả user mới)
        candidates.addAll(trendingSongs(profile));

        // Rule 4: New releases
        candidates.addAll(newestSongs(profile));

        // Deduplicate: giữ bản có score cao nhất cho mỗi songId
        // Đồng thời loại songs user đã nghe gần đây + đã dislike
        Map<UUID, SongScoreDto> deduped = new LinkedHashMap<>();
        for (SongScoreDto item : candidates) {
            UUID songId = item.getSong().getId();

            if (profile.getRecentlyListenedSongIds().contains(songId)) continue;
            if (profile.getDislikedSongIds().contains(songId)) continue;

            deduped.merge(songId, item,
                    (existing, incoming) ->
                            existing.getScore() >= incoming.getScore() ? existing : incoming);
        }

        return scoringEngine.topN(new ArrayList<>(deduped.values()), limit);
    }

    // ----------------------------------------------------------------
    // Rule 1 — Followed artists
    // ----------------------------------------------------------------

    private List<SongScoreDto> songsFromFollowedArtists(UserProfileDto profile) {
        List<SongScoreDto> result = new ArrayList<>();

        for (UUID artistId : profile.getFollowedArtistIds()) {
            try {
                ApiResponse<List<SongDto>> response =
                        musicServiceClient.getSongsByArtist(artistId, 5);

                if (response.getResult() == null) continue;

                response.getResult().forEach(song ->
                        result.add(SongScoreDto.builder()
                                .song(song)
                                .score(scoringEngine.score(song, profile))
                                .reason("followed_artist")
                                .build()));

            } catch (Exception e) {
                log.warn("Rule1 — failed to fetch songs for artist={}: {}", artistId, e.getMessage());
            }
        }

        return result;
    }

    // ----------------------------------------------------------------
    // Rule 2 — Top genres
    // ----------------------------------------------------------------

    private List<SongScoreDto> songsFromTopGenres(UserProfileDto profile) {
        List<SongScoreDto> result = new ArrayList<>();

        // Lấy top 3 genre có affinity cao nhất
        List<UUID> topGenres = profile.getGenreAffinity().entrySet().stream()
                .sorted(Map.Entry.<UUID, Double>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        for (UUID genreId : topGenres) {
            try {
                ApiResponse<PageResponse<SongDto>> response =
                        musicServiceClient.getSongsByGenre(genreId, 1, 10);

                if (response.getResult() == null
                        || response.getResult().getContent() == null) continue;

                response.getResult().getContent().forEach(song ->
                        result.add(SongScoreDto.builder()
                                .song(song)
                                .score(scoringEngine.score(song, profile))
                                .reason("genre_match")
                                .build()));

            } catch (Exception e) {
                log.warn("Rule2 — failed to fetch songs for genre={}: {}", genreId, e.getMessage());
            }
        }

        return result;
    }

    // ----------------------------------------------------------------
    // Rule 3 — Trending
    // ----------------------------------------------------------------

    private List<SongScoreDto> trendingSongs(UserProfileDto profile) {
        try {
            ApiResponse<PageResponse<SongDto>> response =
                    musicServiceClient.getTrending(1, 20);

            if (response.getResult() == null
                    || response.getResult().getContent() == null) return List.of();

            return response.getResult().getContent().stream()
                    .map(song -> {
                        // Tính score bình thường + thêm popularity bonus
                        double base = scoringEngine.score(song, profile);
                        double popularityBonus = song.getPlayCount() != null && song.getPlayCount() > 0
                                ? Math.log10(song.getPlayCount() + 1) * 0.5
                                : 0.1;
                        return SongScoreDto.builder()
                                .song(song)
                                .score(base + popularityBonus)
                                .reason("trending")
                                .build();
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.warn("Rule3 — failed to fetch trending: {}", e.getMessage());
            return List.of();
        }
    }

    // ----------------------------------------------------------------
    // Rule 4 — Newest releases
    // ----------------------------------------------------------------

    private List<SongScoreDto> newestSongs(UserProfileDto profile) {
        try {
            ApiResponse<PageResponse<SongDto>> response =
                    musicServiceClient.getNewest(1, 10);

            if (response.getResult() == null
                    || response.getResult().getContent() == null) return List.of();

            return response.getResult().getContent().stream()
                    .map(song -> SongScoreDto.builder()
                            .song(song)
                            // Score cơ bản từ profile + small bonus để không bị chìm
                            .score(scoringEngine.score(song, profile) + 0.3)
                            .reason("new_release")
                            .build())
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.warn("Rule4 — failed to fetch newest: {}", e.getMessage());
            return List.of();
        }
    }
}