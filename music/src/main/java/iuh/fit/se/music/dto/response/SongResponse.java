package iuh.fit.se.music.dto.response;

import iuh.fit.se.music.enums.SongStatus;
import lombok.*;

import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongResponse {
    private UUID id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private SongStatus status;
    private Long playCount;

    private Set<GenreResponse> genres;

    private String uploadUrl;
}