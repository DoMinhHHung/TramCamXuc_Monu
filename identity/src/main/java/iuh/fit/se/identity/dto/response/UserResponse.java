package iuh.fit.se.identity.dto.response;

import iuh.fit.se.identity.enums.AccountStatus;
import iuh.fit.se.identity.enums.Gender;
import iuh.fit.se.identity.enums.Role;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private LocalDate dob;
    private Gender gender;
    private Role role;
    private AccountStatus status;
}