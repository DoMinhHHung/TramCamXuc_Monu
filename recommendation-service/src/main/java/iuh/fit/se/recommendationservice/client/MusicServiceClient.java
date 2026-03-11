package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.config.FeignConfig;
import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.PageResponse;
import iuh.fit.se.recommendationservice.dto.SongDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(
        name = "music-service",
                configuration = FeignConfig.class
)
public interface MusicServiceClient {

    @GetMapping("/songs/batch")
    ApiResponse<List<SongDto>> getSongsByIds(@RequestParam List<UUID> ids);

    @GetMapping("/artists/{artistId}/songs")
    ApiResponse<List<SongDto>> getSongsByArtist(
            @PathVariable UUID artistId,
            @RequestParam(defaultValue = "10") int limit);

    @GetMapping("/songs/trending")
    ApiResponse<PageResponse<SongDto>> getTrending(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size);

    @GetMapping("/songs/newest")
    ApiResponse<PageResponse<SongDto>> getNewest(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size);

    @GetMapping("/songs")
    ApiResponse<PageResponse<SongDto>> getSongsByGenre(
            @RequestParam(required = false) UUID genreId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size);
}