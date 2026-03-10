package iuh.fit.se.identityservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

/**
 * Response chứa favorites của user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoritesResponse {

    private Boolean pickFavorite;
    private Set<UUID> favoriteGenreIds;
    private Set<UUID> favoriteArtistIds;
}
