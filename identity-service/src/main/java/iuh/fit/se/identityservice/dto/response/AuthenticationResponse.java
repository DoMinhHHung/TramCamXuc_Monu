package iuh.fit.se.identityservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthenticationResponse {
    private String accessToken;
    private String refreshToken;
    private boolean authenticated;
}