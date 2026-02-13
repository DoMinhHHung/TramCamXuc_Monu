package iuh.fit.se.identity.dto.request;

import iuh.fit.se.core.validation.Age;
import iuh.fit.se.identity.enums.Gender;
import jakarta.validation.constraints.Past;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProfileUpdateRequest {
    private String fullName;

    @Past(message = "DOB_MUST_BE_IN_PAST")
    @Age(min = 13, message = "AGE_TOO_YOUNG")
    private LocalDate dob;

    private Gender gender;
}