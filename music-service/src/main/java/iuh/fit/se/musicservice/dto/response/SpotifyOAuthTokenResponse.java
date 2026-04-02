package iuh.fit.se.musicservice.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SpotifyOAuthTokenResponse {
    private String accessToken;
    private String tokenType;
    private Integer expiresIn;
    private String refreshToken;
    private String scope;
}
