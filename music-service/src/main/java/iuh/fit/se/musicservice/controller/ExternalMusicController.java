// music-service/src/main/java/iuh/fit/se/musicservice/controller/ExternalMusicController.java

package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SpotifyTrackResult;
import iuh.fit.se.musicservice.repository.SoundCloudTrackResult;
import iuh.fit.se.musicservice.service.impl.SoundCloudService;
import iuh.fit.se.musicservice.service.impl.SpotifyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/external")
@RequiredArgsConstructor
@Slf4j
public class ExternalMusicController {

    private final SpotifyService spotifyService;
    private final SoundCloudService soundCloudService;

    @GetMapping(value = "/soundcloud/tracks/{soundcloudId:.+}/stream-url",
            produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getSoundCloudPlayableUrl(@PathVariable String soundcloudId) {
        try {
                String playableUrl = soundCloudService.resolvePlayableStreamUrl(soundcloudId);
                return ResponseEntity.ok(playableUrl);
        } catch (Exception e) {
                log.error("[SoundCloud] Cannot resolve stream URL for id={}: {}", soundcloudId, e.getMessage());
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("Stream not available");
        }
        }

    // ── Spotify ───────────────────────────────────────────────────────────────

    /**
     * Tìm kiếm Spotify.
     * Trả về metadata + spotify URI để deep link.
     * GET /external/spotify/search?q=...&limit=20
     */
    @GetMapping("/spotify/search")
    public ApiResponse<List<SpotifyTrackResult>> searchSpotify(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {

        return ApiResponse.<List<SpotifyTrackResult>>builder()
                .result(spotifyService.searchTracks(q, limit))
                .build();
    }

    // ── SoundCloud ────────────────────────────────────────────────────────────

    /**
     * Tìm kiếm SoundCloud.
     * GET /external/soundcloud/search?q=...&limit=20
     */
    @GetMapping("/soundcloud/search")
    public ApiResponse<List<SoundCloudTrackResult>> searchSoundCloud(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {

        return ApiResponse.<List<SoundCloudTrackResult>>builder()
                .result(soundCloudService.searchTracks(q, limit))
                .build();
    }

    /**
     * Lấy stream URL SoundCloud (để player dùng).
     * GET /external/soundcloud/tracks/{soundcloudId}/stream
     */
    @GetMapping("/soundcloud/tracks/{soundcloudId:.+}/stream")
    public ApiResponse<String> getSoundCloudStreamUrl(@PathVariable String soundcloudId) {
        return ApiResponse.<String>builder()
                .result(soundCloudService.getStreamUrl(soundcloudId))
                .build();
    }

    /**
     * Proxy stream SoundCloud cho player.
     * GET /external/soundcloud/tracks/{soundcloudId}/proxy
     */
    @GetMapping("/soundcloud/tracks/{soundcloudId:.+}/proxy")
    public ResponseEntity<Void> proxySoundCloudStream(@PathVariable String soundcloudId) {
        try {
            String playableUrl = soundCloudService.resolvePlayableStreamUrl(soundcloudId);
            return ResponseEntity.status(302)
                    .location(new URI(playableUrl))
                    .build();
        } catch (Exception e) {
            log.error("[SoundCloud] Proxy failed for id={}: {}", soundcloudId, e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

}