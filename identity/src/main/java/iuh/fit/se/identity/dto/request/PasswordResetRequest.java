package iuh.fit.se.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PasswordResetRequest {

    @NotBlank(message = "Email must not be blank")
    @Email(message = "INVALID_EMAIL")
    private String email;

    @NotBlank(message = "OTP code must not be blank")
    private String otp;

    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
            message = "INVALID_PASSWORD"
    )
    private String newPassword;
}