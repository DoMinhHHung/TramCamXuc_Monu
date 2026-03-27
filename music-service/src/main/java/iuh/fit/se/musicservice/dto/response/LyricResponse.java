package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.LyricFormat;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LyricResponse {
    private UUID songId;
    private LyricFormat format;
    private List<LyricLine> lines;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LyricLine {
        private Long timeMs;
        private String text;
    }
}