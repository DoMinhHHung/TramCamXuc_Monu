package iuh.fit.se.musicservice.dto.messaging;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMusicGenerateMessage {
    private UUID jobId;
    private UUID userId;
    private String periodYm;
    private String title;
    private List<String> genreIds;
    private String lyrics;
    private String stylePrompt;
    private int durationSeconds;
    /** Tên thể loại (tiếng Anh/VN) để enrich prompt. */
    private List<String> genreNames;
}
