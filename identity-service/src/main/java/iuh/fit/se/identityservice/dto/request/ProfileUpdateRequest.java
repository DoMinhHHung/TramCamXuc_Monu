package iuh.fit.se.identityservice.dto.request;

import iuh.fit.se.identityservice.enums.Gender;
import iuh.fit.se.identityservice.validation.Age;
import jakarta.validation.constraints.Past;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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