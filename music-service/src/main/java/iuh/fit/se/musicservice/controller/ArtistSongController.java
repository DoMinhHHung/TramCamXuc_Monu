package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Exposes artist-scoped song endpoints under /api/v1/artists/{artistId}/songs.
 * Called by recommendation-service via Feign: MusicServiceClient.getSongsByArtist().
 */
@RestController
@RequestMapping("/api/v1/artists")
@RequiredArgsConstructor
public class ArtistSongController {

    private final SongService songService;

    /**
     * Top bài hát PUBLIC của một nghệ sĩ, sắp xếp theo playCount DESC.
     * GET /api/v1/artists/{artistId}/songs?limit=10
     * Cached 15 min — safe for recommendation-service to call frequently.
     */
    @GetMapping("/{artistId}/songs")
    public ApiResponse<List<SongResponse>> getSongsByArtist(
            @PathVariable UUID artistId,
            @RequestParam(defaultValue = "10") int limit) {

        return ApiResponse.<List<SongResponse>>builder()
                .result(songService.getSongsByArtistTop(artistId, Math.min(limit, 50)))
                .build();
    }
}

