package iuh.fit.se.identity.dto.response;
import lombok.*;

@Data
@Builder
public class AuthenticationResponse {
    private String accessToken;
    private String refreshToken;
    private boolean authenticated;
}