package iuh.fit.se.identityservice.dto.response;

import iuh.fit.se.identityservice.enums.*;
import lombok.*;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String fullName;
    private String displayName;
    private String email;
    private String avatarUrl;
    private LocalDate dob;
    private Gender gender;
    private Role role;
    private AccountStatus status;

    // Favorites for onboarding
    private Boolean pickFavorite;
    private Set<UUID> favoriteGenreIds;
    private Set<UUID> favoriteArtistIds;
}