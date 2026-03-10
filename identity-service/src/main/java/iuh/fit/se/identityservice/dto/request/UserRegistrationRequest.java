package iuh.fit.se.identityservice.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import iuh.fit.se.identityservice.enums.Gender;
import iuh.fit.se.identityservice.validation.Age;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRegistrationRequest {
    @NotBlank(message = "EMAIL_NOT_BLANK")
    @Email(message = "EMAIL_INVALID_FORMAT")
    private String email;

    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
            message = "INVALID_PASSWORD"
    )
    private String password;

    @NotBlank(message = "FULLNAME_NOT_BLANK")
    private String fullName;

    @NotNull(message = "DOB_REQUIRED")
    @Past(message = "DOB_MUST_BE_IN_PAST")
    @Age(min = 13, message = "AGE_TOO_YOUNG")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dob;

    private Gender gender;
}
