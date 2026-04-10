package iuh.fit.se.musicservice.dto.internal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMusicJobRedisState {
    private String jobId;
    private String userId;
    private String periodYm;
    private String status;
    private String title;
    private List<String> genreIds;
    private List<String> genreNames;
    private String lyrics;
    private String stylePrompt;
    private int durationSeconds;
    private String previewRawKey;
    private String errorMessage;
}
