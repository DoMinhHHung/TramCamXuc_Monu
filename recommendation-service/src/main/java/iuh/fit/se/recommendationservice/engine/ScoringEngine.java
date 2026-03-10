package iuh.fit.se.recommendationservice.engine;

import iuh.fit.se.recommendationservice.dto.GenreDto;
import iuh.fit.se.recommendationservice.dto.SongDto;
import iuh.fit.se.recommendationservice.dto.SongScoreDto;
import iuh.fit.se.recommendationservice.dto.UserProfileDto;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class ScoringEngine {

    /**
     * Tính score cho 1 song dựa trên user profile.
     *
     * Công thức:
     *   genre_affinity   × 4.0  (tổng các genre của bài)
     *   artist_affinity  × 3.0
     *   followed_artist  + 2.0  (bonus cố định)
     *   hearted          + 1.5
     *   disliked         - 10.0 (hard penalty)
     *   popularity       + log10(playCount) × 0.5
     */
    public double score(SongDto song, UserProfileDto profile) {
        double score = 0.0;

        UUID songId   = song.getId();
        UUID artistId = song.getPrimaryArtist() != null
                ? song.getPrimaryArtist().getArtistId() : null;

        // 1. Genre affinity
        if (song.getGenres() != null) {
            for (GenreDto genre : song.getGenres()) {
                double affinity = profile.getGenreAffinity()
                        .getOrDefault(genre.getId(), 0.0);
                score += affinity * 4.0;
            }
        }

        // 2. Artist affinity (từ lịch sử nghe)
        if (artistId != null) {
            double artistAffinity = profile.getArtistAffinity()
                    .getOrDefault(artistId, 0.0);
            score += artistAffinity * 3.0;
        }

        // 3. Followed artist bonus
        if (artistId != null && profile.getFollowedArtistIds().contains(artistId)) {
            score += 2.0;
        }

        // 4. Hearted bonus
        if (profile.getHeartedSongIds().contains(songId)) {
            score += 1.5;
        }

        // 5. Liked bonus
        if (profile.getLikedSongIds().contains(songId)) {
            score += 1.0;
        }

        // 6. Dislike hard penalty
        if (profile.getDislikedSongIds().contains(songId)) {
            score -= 10.0;
        }

        // 7. Popularity boost (log scale)
        if (song.getPlayCount() != null && song.getPlayCount() > 0) {
            score += Math.log10(song.getPlayCount()) * 0.5;
        }

        return score;
    }

    /**
     * Sort danh sách đã scored, lọc score > 0, lấy top N.
     */
    public List<SongScoreDto> topN(List<SongScoreDto> scored, int n) {
        return scored.stream()
                .filter(s -> s.getScore() > 0)
                .sorted(Comparator.comparingDouble(SongScoreDto::getScore).reversed())
                .limit(n)
                .collect(Collectors.toList());
    }
}