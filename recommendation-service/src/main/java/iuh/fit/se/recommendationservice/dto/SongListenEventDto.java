package iuh.fit.se.recommendationservice.dto;
import lombok.*;
import java.util.List;
@Data @NoArgsConstructor @AllArgsConstructor
public class SongListenEventDto {
    private String songId;
    private String songTitle;
    private String artistId;
    private String artistStageName;
    private String userId;
    private String playlistId;
    private String albumId;
    private int durationSeconds;
    private boolean completed;
    private List<String> genreIds;
    private List<String> genreNames;
    private String listenedAt;
}