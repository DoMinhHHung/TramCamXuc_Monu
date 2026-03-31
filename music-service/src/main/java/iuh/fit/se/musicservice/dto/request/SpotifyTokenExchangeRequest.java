package iuh.fit.se.musicservice.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SpotifyTokenExchangeRequest {
    private String code;
    private String redirectUri;
    private String codeVerifier;
}
