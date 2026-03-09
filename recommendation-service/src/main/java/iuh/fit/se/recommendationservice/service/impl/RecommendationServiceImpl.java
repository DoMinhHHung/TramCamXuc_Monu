package iuh.fit.se.recommendationservice.service.impl;

import iuh.fit.se.recommendationservice.client.MusicServiceClient;
import iuh.fit.se.recommendationservice.dto.*;
import iuh.fit.se.recommendationservice.engine.RuleBasedEngine;
import iuh.fit.se.recommendationservice.engine.ScoringEngine;
import iuh.fit.se.recommendationservice.service.RecommendationService;
import iuh.fit.se.recommendationservice.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationServiceImpl implements RecommendationService {

    private final RuleBasedEngine    ruleBasedEngine;
    private final ScoringEngine      scoringEngine;
    private final UserProfileService userProfileService;
    private final MusicServiceClient musicServiceClient;

    // ----------------------------------------------------------------
    // forYou — personalized
    // ----------------------------------------------------------------

    @Override
    public RecommendationResponse forYou(UUID userId, int limit) {
        long start = System.currentTimeMillis();

        UserProfileDto profile = userProfileService.buildProfile(userId);
        List<SongScoreDto> songs = ruleBasedEngine.recommend(profile, limit);

        // Nếu rule-based không đủ số lượng → bổ sung trending
        if (songs.size() < limit) {
            songs = fillWithTrending(songs, profile, limit);
        }

        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("rule_based")
                .mlUsed(false)
                .computeTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    // ----------------------------------------------------------------
    // trending — public
    // ----------------------------------------------------------------

    @Override
    public RecommendationResponse trending(int limit) {
        long start = System.currentTimeMillis();

        List<SongScoreDto> songs = new ArrayList<>();
        try {
            ApiResponse<PageResponse<SongDto>> response =
                    musicServiceClient.getTrending(1, limit);

            if (response.getResult() != null
                    && response.getResult().getContent() != null) {

                songs = response.getResult().getContent().stream()
                        .map(song -> SongScoreDto.builder()
                                .song(song)
                                .score(song.getPlayCount() != null
                                        ? Math.log10(song.getPlayCount() + 1)
                                        : 0.1)
                                .reason("trending")
                                .build())
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch trending songs: {}", e.getMessage());
        }

        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("trending")
                .mlUsed(false)
                .computeTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    // ----------------------------------------------------------------
    // similar — content-based
    // ----------------------------------------------------------------

    @Override
    public RecommendationResponse similar(UUID songId, int limit) {
        long start = System.currentTimeMillis();

        List<SongScoreDto> songs = new ArrayList<>();
        try {
            // Lấy thông tin seed song
            ApiResponse<List<SongDto>> seedResponse =
                    musicServiceClient.getSongsByIds(List.of(songId));

            if (seedResponse.getResult() == null || seedResponse.getResult().isEmpty()) {
                return emptyResponse("content_based", start);
            }

            SongDto seedSong = seedResponse.getResult().get(0);

            // Lấy candidates cùng genre
            List<SongDto> candidates = new ArrayList<>();
            if (seedSong.getGenres() != null) {
                for (GenreDto genre : seedSong.getGenres()) {
                    try {
                        ApiResponse<PageResponse<SongDto>> genreResponse =
                                musicServiceClient.getSongsByGenre(genre.getId(), 1, 20);
                        if (genreResponse.getResult() != null
                                && genreResponse.getResult().getContent() != null) {
                            candidates.addAll(genreResponse.getResult().getContent());
                        }
                    } catch (Exception e) {
                        log.warn("Failed to fetch songs for genre {}: {}", genre.getId(), e.getMessage());
                    }
                }
            }

            // Score candidates theo độ tương đồng với seed
            songs = candidates.stream()
                    .filter(s -> !s.getId().equals(songId)) // loại chính seed
                    .map(s -> SongScoreDto.builder()
                            .song(s)
                            .score(computeSimilarity(seedSong, s))
                            .reason("content_based")
                            .build())
                    .filter(s -> s.getScore() > 0)
                    .sorted(Comparator.comparingDouble(SongScoreDto::getScore).reversed())
                    .limit(limit)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.warn("Failed to compute similar songs for {}: {}", songId, e.getMessage());
        }

        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("content_based")
                .mlUsed(false)
                .computeTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    // ----------------------------------------------------------------
    // newReleases — public
    // ----------------------------------------------------------------

    @Override
    public RecommendationResponse newReleases(int limit) {
        long start = System.currentTimeMillis();

        List<SongScoreDto> songs = new ArrayList<>();
        try {
            ApiResponse<PageResponse<SongDto>> response =
                    musicServiceClient.getNewest(1, limit);

            if (response.getResult() != null
                    && response.getResult().getContent() != null) {

                songs = response.getResult().getContent().stream()
                        .map(song -> SongScoreDto.builder()
                                .song(song)
                                .score(1.0)
                                .reason("new_release")
                                .build())
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch new releases: {}", e.getMessage());
        }

        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("new_releases")
                .mlUsed(false)
                .computeTimeMs(System.currentTimeMillis() - start)
                .build();
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /**
     * Tính độ tương đồng giữa 2 songs dựa trên genre overlap + same artist.
     */
    private double computeSimilarity(SongDto seed, SongDto candidate) {
        double score = 0.0;

        // Genre overlap
        if (seed.getGenres() != null && candidate.getGenres() != null) {
            Set<UUID> seedGenres = seed.getGenres().stream()
                    .map(GenreDto::getId).collect(Collectors.toSet());
            Set<UUID> candGenres = candidate.getGenres().stream()
                    .map(GenreDto::getId).collect(Collectors.toSet());

            long overlap = seedGenres.stream().filter(candGenres::contains).count();
            double union  = seedGenres.size() + candGenres.size() - overlap;
            if (union > 0) {
                score += (overlap / union) * 3.0; // Jaccard similarity × weight
            }
        }

        // Same artist bonus
        if (seed.getPrimaryArtist() != null && candidate.getPrimaryArtist() != null
                && seed.getPrimaryArtist().getArtistId()
                .equals(candidate.getPrimaryArtist().getArtistId())) {
            score += 2.0;
        }

        // Popularity boost nhẹ
        if (candidate.getPlayCount() != null && candidate.getPlayCount() > 0) {
            score += Math.log10(candidate.getPlayCount() + 1) * 0.2;
        }

        return score;
    }

    /**
     * Bổ sung trending vào kết quả khi rule-based không đủ limit.
     */
    private List<SongScoreDto> fillWithTrending(
            List<SongScoreDto> existing, UserProfileDto profile, int limit) {

        Set<UUID> existingIds = existing.stream()
                .map(s -> s.getSong().getId())
                .collect(Collectors.toSet());

        try {
            ApiResponse<PageResponse<SongDto>> response =
                    musicServiceClient.getTrending(1, limit);

            if (response.getResult() == null
                    || response.getResult().getContent() == null) return existing;

            List<SongScoreDto> result = new ArrayList<>(existing);

            response.getResult().getContent().stream()
                    .filter(s -> !existingIds.contains(s.getId()))
                    .filter(s -> !profile.getRecentlyListenedSongIds().contains(s.getId()))
                    .filter(s -> !profile.getDislikedSongIds().contains(s.getId()))
                    .map(s -> SongScoreDto.builder()
                            .song(s)
                            .score(scoringEngine.score(s, profile) + 0.1)
                            .reason("trending_fill")
                            .build())
                    .limit(limit - existing.size())
                    .forEach(result::add);

            return result;
        } catch (Exception e) {
            log.warn("fillWithTrending failed: {}", e.getMessage());
            return existing;
        }
    }

    private RecommendationResponse emptyResponse(String strategy, long start) {
        return RecommendationResponse.builder()
                .songs(List.of())
                .strategy(strategy)
                .mlUsed(false)
                .computeTimeMs(System.currentTimeMillis() - start)
                .build();
    }
}