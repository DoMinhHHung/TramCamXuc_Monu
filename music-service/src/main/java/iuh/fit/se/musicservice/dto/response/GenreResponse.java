package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.Genre;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class GenreResponse {
    private String name;
    private String displayName;

    public static GenreResponse from(Genre genre) {
        return GenreResponse.builder()
                .name(genre.name())
                .displayName(genre.getDisplayName())
                .build();
    }
}