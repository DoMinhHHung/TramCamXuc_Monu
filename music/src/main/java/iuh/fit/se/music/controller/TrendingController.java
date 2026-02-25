package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.dto.response.AlbumResponse;
import iuh.fit.se.music.dto.response.ArtistResponse;
import iuh.fit.se.music.enums.TrendingPeriod;
import iuh.fit.se.music.service.SongService;
import iuh.fit.se.music.service.AlbumService;
import iuh.fit.se.music.service.ArtistService;
import iuh.fit.se.music.service.TrendingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/trending")
@RequiredArgsConstructor
public class TrendingController {

    private final TrendingService trendingService;
    private final SongService songService;
    private final ArtistService artistService;

    @GetMapping("/songs")
    public ApiResponse<List<SongResponse>> topSongs(
            @RequestParam(defaultValue = "WEEK") TrendingPeriod period,
            @RequestParam(defaultValue = "20") int limit) {
        List<UUID> ids = trendingService.getTopSongs(period, limit);
        List<SongResponse> result = ids.stream()
                .map(id -> {
                    try { return songService.getSongById(id); }
                    catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        return ApiResponse.<List<SongResponse>>builder().result(result).build();
    }

    @GetMapping("/artists")
    public ApiResponse<List<ArtistResponse>> topArtists(
            @RequestParam(defaultValue = "MONTH") TrendingPeriod period,
            @RequestParam(defaultValue = "10") int limit) {
        List<UUID> ids = trendingService.getTopArtists(period, limit);
        List<ArtistResponse> result = ids.stream()
                .map(id -> {
                    try {
                        return artistService.getProfileByUserId(id);
                    }
                    catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        return ApiResponse.<List<ArtistResponse>>builder().result(result).build();
    }
}