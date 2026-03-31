package iuh.fit.se.musicservice.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SpotifyRefreshTokenRequest {
    private String refreshToken;
}
