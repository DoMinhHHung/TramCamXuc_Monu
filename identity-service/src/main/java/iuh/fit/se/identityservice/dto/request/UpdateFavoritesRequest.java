package iuh.fit.se.identityservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

/**
 * Request để user pick/update favorites.
 * Dùng cho onboarding screen và settings screen.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateFavoritesRequest {

    /**
     * Danh sách genre IDs yêu thích (1-5 genres).
     */
    @NotNull(message = "Favorite genres cannot be null")
    @Size(min = 1, max = 5, message = "Must select 1-5 favorite genres")
    private Set<UUID> favoriteGenreIds;

    /**
     * Danh sách artist IDs yêu thích (1-3 artists).
     */
    @NotNull(message = "Favorite artists cannot be null")
    @Size(min = 1, max = 3, message = "Must select 1-3 favorite artists")
    private Set<UUID> favoriteArtistIds;
}
