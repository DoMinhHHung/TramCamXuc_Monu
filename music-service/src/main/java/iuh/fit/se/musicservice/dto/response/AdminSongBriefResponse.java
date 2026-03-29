package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.SongStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSongBriefResponse {
    private UUID id;
    private String title;
    private String primaryArtistStageName;
    private SongStatus status;
}
