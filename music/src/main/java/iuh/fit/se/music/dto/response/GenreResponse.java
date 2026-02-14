package iuh.fit.se.music.dto.response;

import lombok.*;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenreResponse {
    private UUID id;
    private String name;
    private String description;
}