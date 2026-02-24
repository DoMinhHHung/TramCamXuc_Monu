package iuh.fit.se.music.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlbumApprovalRequest {

    @NotBlank(message = "Rejection reason must not be blank")
    @Size(max = 1000)
    private String rejectionReason;
}