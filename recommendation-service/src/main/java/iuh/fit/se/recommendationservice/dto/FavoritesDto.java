package iuh.fit.se.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoritesDto {
    private Boolean pickFavorite;
    private Set<UUID> favoriteGenreIds;
    private Set<UUID> favoriteArtistIds;
}
