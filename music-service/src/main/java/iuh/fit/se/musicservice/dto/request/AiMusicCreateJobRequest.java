package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class AiMusicCreateJobRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    @NotEmpty
    private List<UUID> genreIds;

    @NotBlank
    @Size(max = 12000)
    private String lyrics;

    @Size(max = 2000)
    private String stylePrompt;

    /**
     * Độ dài mục tiêu (giây), sẽ bị clamp theo gói subscription.
     */
    private int durationSeconds = 60;
}
