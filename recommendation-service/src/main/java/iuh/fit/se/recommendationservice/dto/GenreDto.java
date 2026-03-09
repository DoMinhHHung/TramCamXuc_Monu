package iuh.fit.se.recommendationservice.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenreDto {
    private UUID id;
    private String name;
}