package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {
    private UUID userId;
    private Map<UUID, Double> genreAffinity;
    private Map<UUID, Double> artistAffinity;
    private Set<UUID> recentlyListenedSongIds;
    private Set<UUID> followedArtistIds;
    private Set<UUID> likedSongIds;
    private Set<UUID> dislikedSongIds;
    private Set<UUID> heartedSongIds;

    // ── Favorites for cold-start recommendation ────────────────────────────────
    private Set<UUID> favoriteGenreIds;
    private Set<UUID> favoriteArtistIds;
}