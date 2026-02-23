package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongApprovalRequest {

    @Size(max = 1000, message = "Rejection reason must not exceed 1000 characters")
    private String rejectionReason;
}