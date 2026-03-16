package iuh.fit.se.recommendationservice.dto;
import lombok.*;
import java.util.Set;
import java.util.UUID;
@Data @NoArgsConstructor @AllArgsConstructor
public class UserFavoritesDto {
    private Boolean pickFavorite;
    private Set<UUID> favoriteGenreIds;
    private Set<UUID> favoriteArtistIds;
}