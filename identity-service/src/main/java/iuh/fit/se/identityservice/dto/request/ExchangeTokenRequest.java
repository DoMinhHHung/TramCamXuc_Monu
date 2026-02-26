package iuh.fit.se.identityservice.dto.request;

import iuh.fit.se.identityservice.enums.AuthProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


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