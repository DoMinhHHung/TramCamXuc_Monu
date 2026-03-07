package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.SongDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "music-service", path = "/api/v1")
public interface MusicServiceClient {

    @GetMapping("/songs/trending")
    List<SongDTO> getTrendingSongs(@RequestParam(defaultValue = "20") int limit);

    @GetMapping("/songs")
    List<SongDTO> getSongsByGenre(
            @RequestParam("genreId") String genreId,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "20")  int size
    );

    @GetMapping("/artists/{artistId}/songs")
    List<SongDTO> getSongsByArtist(
            @PathVariable("artistId") String artistId,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "10")  int size
    );

    @GetMapping("/songs/batch")
    List<SongDTO> getSongsByIds(@RequestParam("ids") List<String> ids);

    @GetMapping("/songs/{songId}")
    SongDTO getSongById(@PathVariable("songId") String songId);
}