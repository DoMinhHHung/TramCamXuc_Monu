package iuh.fit.se.musicservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMusicJobResponse {
    private UUID jobId;
    private String status;
    private String title;
    private String previewUrl;
    private String errorMessage;
}
