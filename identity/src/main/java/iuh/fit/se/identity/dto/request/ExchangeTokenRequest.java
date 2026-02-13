package iuh.fit.se.identity.dto.request;

import iuh.fit.se.identity.enums.AuthProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExchangeTokenRequest {
    @NotBlank(message = "Token must not be blank")
    private String token;

    @NotNull(message = "Provider must not be null")
    private AuthProvider provider;
}