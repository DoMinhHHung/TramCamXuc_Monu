package iuh.fit.se.identity.dto.request;

import iuh.fit.se.identity.enums.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreationRequest {
    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email invalid format")
    private String email;

    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private LocalDate dob;

    private Gender gender;
}
