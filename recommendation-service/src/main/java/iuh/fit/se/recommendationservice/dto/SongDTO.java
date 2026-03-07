package iuh.fit.se.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongDTO {
    private String id;
    private String title;
    private String slug;
    private String primaryArtistId;
    private String primaryArtistName;
    private Long   playCount;
    private String coverImageUrl;
    private String audioUrl;
    private Integer durationSeconds;
    private LocalDate releaseDate;
    private List<String> genreIds;
    private List<String> genreNames;
    private String albumId;
    private String albumTitle;
    private String status;
}