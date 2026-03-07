package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.client.MusicServiceClient;
import iuh.fit.se.recommendationservice.client.SocialServiceClient;
import iuh.fit.se.recommendationservice.dto.ListenHistoryDTO;
import iuh.fit.se.recommendationservice.dto.RecommendationResponse;
import iuh.fit.se.recommendationservice.dto.SongDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleBasedRecommendationService {

    private final MusicServiceClient  musicServiceClient;
    private final SocialServiceClient socialServiceClient;

    @Value("${recommendation.default-limit:20}")
    private int defaultLimit;

    // ─────────────────────────────────────────────────────────────
    // 1. TRENDING
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse trending(int limit) {
        List<SongDTO> songs = musicServiceClient.getTrendingSongs(limit);
        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("RULE_TRENDING")
                .total(songs.size())
                .reason("Bài hát đang hot nhất")
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GENRE MIX  — dựa trên genre nghe nhiều nhất
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse genreMix(String userId, int limit) {
        List<ListenHistoryDTO> history = fetchHistory(userId, 50);

        if (history.isEmpty()) {
            // Cold start → fallback trending
            return trending(limit);
        }

        // Đếm genre nào nghe nhiều nhất (top 3)
        Map<String, Long> genreCount = history.stream()
                .filter(h -> h.getSongId() != null)
                .flatMap(h -> {
                    // Lấy chi tiết bài để biết genre (nếu history có genreIds thì không cần bước này)
                    try {
                        SongDTO song = musicServiceClient.getSongById(h.getSongId());
                        return song.getGenreIds() != null
                                ? song.getGenreIds().stream()
                                : java.util.stream.Stream.empty();
                    } catch (Exception e) {
                        return java.util.stream.Stream.empty();
                    }
                })
                .collect(Collectors.groupingBy(g -> g, Collectors.counting()));

        List<String> topGenres = genreCount.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // Set bài đã nghe để loại trừ
        Set<String> listenedSongIds = history.stream()
                .map(ListenHistoryDTO::getSongId)
                .collect(Collectors.toSet());

        // Lấy bài từ top genres, loại trừ đã nghe
        int perGenre = (limit / topGenres.size()) + 2; // lấy dư để sau khi filter vẫn đủ
        List<SongDTO> songs = topGenres.stream()
                .flatMap(genreId -> {
                    try {
                        return musicServiceClient.getSongsByGenre(genreId, 0, perGenre).stream();
                    } catch (Exception e) {
                        log.warn("Failed to fetch songs for genre {}: {}", genreId, e.getMessage());
                        return java.util.stream.Stream.empty();
                    }
                })
                .filter(song -> !listenedSongIds.contains(song.getId()))
                .distinct()
                .limit(limit)
                .collect(Collectors.toList());

        // Nếu không đủ → bổ sung bằng trending
        if (songs.size() < limit / 2) {
            return trending(limit);
        }

        String genreNames = topGenres.stream().limit(2).collect(Collectors.joining(", "));
        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("RULE_GENRE_MIX")
                .total(songs.size())
                .reason("Dựa trên thể loại bạn hay nghe: " + genreNames)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. NEW RELEASES  — bài mới từ artist đang follow
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse newReleases(String userId, int limit) {
        List<String> followedArtistIds;
        try {
            followedArtistIds = socialServiceClient.getFollowedArtistIds(userId);
        } catch (Exception e) {
            log.warn("Failed to fetch followed artists for {}: {}", userId, e.getMessage());
            return trending(limit);
        }

        if (followedArtistIds.isEmpty()) {
            return trending(limit);
        }

        int perArtist = Math.max(2, limit / followedArtistIds.size());
        List<SongDTO> songs = followedArtistIds.stream()
                .limit(10) // không query quá nhiều artists cùng lúc
                .flatMap(artistId -> {
                    try {
                        return musicServiceClient.getSongsByArtist(artistId, 0, perArtist).stream();
                    } catch (Exception e) {
                        log.warn("Failed to fetch songs for artist {}: {}", artistId, e.getMessage());
                        return java.util.stream.Stream.empty();
                    }
                })
                // Sort mới nhất lên đầu
                .sorted(Comparator.comparing(
                        SongDTO::getReleaseDate,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .distinct()
                .limit(limit)
                .collect(Collectors.toList());

        if (songs.isEmpty()) {
            return trending(limit);
        }

        return RecommendationResponse.builder()
                .songs(songs)
                .strategy("RULE_NEW_RELEASES")
                .total(songs.size())
                .reason("Nhạc mới từ nghệ sĩ bạn theo dõi")
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. SIMILAR SONGS  — cùng genre + cùng artist, loại trừ bài gốc
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse similarSongs(String songId, int limit) {
        SongDTO song;
        try {
            song = musicServiceClient.getSongById(songId);
        } catch (Exception e) {
            log.warn("Failed to fetch song {}: {}", songId, e.getMessage());
            return trending(limit);
        }

        List<SongDTO> results = new ArrayList<>();

        if (song.getGenreIds() != null && !song.getGenreIds().isEmpty()) {
            String primaryGenre = song.getGenreIds().get(0);
            try {
                List<SongDTO> byGenre = musicServiceClient.getSongsByGenre(primaryGenre, 0, limit + 5);
                byGenre.stream()
                        .filter(s -> !s.getId().equals(songId))
                        .forEach(results::add);
            } catch (Exception e) {
                log.warn("Failed to fetch songs by genre: {}", e.getMessage());
            }
        }

        if (results.size() < limit && song.getPrimaryArtistId() != null) {
            try {
                List<SongDTO> byArtist = musicServiceClient.getSongsByArtist(
                        song.getPrimaryArtistId(), 0, limit);
                byArtist.stream()
                        .filter(s -> !s.getId().equals(songId))
                        .filter(s -> results.stream().noneMatch(r -> r.getId().equals(s.getId())))
                        .forEach(results::add);
            } catch (Exception e) {
                log.warn("Failed to fetch songs by artist: {}", e.getMessage());
            }
        }

        List<SongDTO> finalList = results.stream().limit(limit).collect(Collectors.toList());

        return RecommendationResponse.builder()
                .songs(finalList)
                .strategy("RULE_SIMILAR")
                .total(finalList.size())
                .reason("Tương tự \"" + song.getTitle() + "\"")
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. FOR YOU (rule-based fallback)
    //    = 50% genre mix + 30% new releases + 20% trending
    // ─────────────────────────────────────────────────────────────

    public RecommendationResponse forYouFallback(String userId, int limit) {
        int genreCount    = (int) (limit * 0.5);
        int newRelCount   = (int) (limit * 0.3);
        int trendingCount = limit - genreCount - newRelCount;

        List<SongDTO> combined = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        addUnique(combined, seen, genreMix(userId, genreCount).getSongs());
        addUnique(combined, seen, newReleases(userId, newRelCount).getSongs());
        addUnique(combined, seen, trending(trendingCount).getSongs());

        Collections.shuffle(combined);
        List<SongDTO> finalList = combined.stream().limit(limit).collect(Collectors.toList());

        return RecommendationResponse.builder()
                .songs(finalList)
                .strategy("RULE_FOR_YOU")
                .total(finalList.size())
                .reason("Dành riêng cho bạn")
                .build();
    }

    // ── Private helpers ──────────────────────────────────────────

    private List<ListenHistoryDTO> fetchHistory(String userId, int limit) {
        try {
            return socialServiceClient.getListenHistory(userId, limit, 90);
        } catch (Exception e) {
            log.warn("Failed to fetch listen history for {}: {}", userId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private void addUnique(List<SongDTO> target, Set<String> seen, List<SongDTO> source) {
        for (SongDTO song : source) {
            if (seen.add(song.getId())) {
                target.add(song);
            }
        }
    }
}