package iuh.fit.se.music.dto.response;

import iuh.fit.se.music.enums.ArtistStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArtistResponse {
    private UUID id;
    private UUID userId;
    private String stageName;
    private String bio;
    private String avatarUrl;
    private ArtistStatus status;
    private LocalDateTime createdAt;
}