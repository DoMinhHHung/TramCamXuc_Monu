// music-service/src/main/java/iuh/fit/se/musicservice/controller/ExternalMusicController.java

package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.dto.response.SpotifyTrackResult;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.mapper.SongMapper;
import iuh.fit.se.musicservice.repository.PlaylistRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.repository.SoundCloudTrackResult;
import iuh.fit.se.musicservice.service.PlaylistService;
import iuh.fit.se.musicservice.service.impl.SoundCloudService;
import iuh.fit.se.musicservice.service.impl.SpotifyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/external")
@RequiredArgsConstructor
@Slf4j
public class ExternalMusicController {

    private final SpotifyService spotifyService;
    private final SoundCloudService soundCloudService;
    private final SongRepository songRepository;
    private final SongMapper songMapper;
    private final PlaylistService playlistService;

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
    @GetMapping("/soundcloud/tracks/{soundcloudId}/stream")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> getSoundCloudStreamUrl(@PathVariable String soundcloudId) {
        return ApiResponse.<String>builder()
                .result(soundCloudService.getStreamUrl(soundcloudId))
                .build();
    }

    /**
     * Lưu SoundCloud track vào DB (để có thể thêm vào playlist).
     * POST /external/soundcloud/tracks/save
     * Body: SoundCloudTrackResult JSON
     */
    @PostMapping("/soundcloud/tracks/save")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<SongResponse> saveSoundCloudTrack(
            @RequestBody SoundCloudTrackResult trackData) {

        if (trackData.getId() == null || trackData.getStreamUrl() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Song song = soundCloudService.saveOrGetSoundCloudTrack(
                trackData.getId(), trackData);

        return ApiResponse.<SongResponse>builder()
                .result(songMapper.toResponse(song))
                .build();
    }

    /**
     * Thêm SoundCloud track vào playlist:
     *  1. Lưu track vào DB nếu chưa có
     *  2. Thêm vào playlist như Song bình thường
     * POST /external/soundcloud/tracks/save-and-add-to-playlist/{playlistId}
     */
    @PostMapping("/soundcloud/tracks/save-and-add-to-playlist/{playlistId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Map<String, Object>> saveAndAddToPlaylist(
            @PathVariable UUID playlistId,
            @RequestBody SoundCloudTrackResult trackData) {

        // Lưu track
        Song song = soundCloudService.saveOrGetSoundCloudTrack(
                trackData.getId(), trackData);

        // Thêm vào playlist
        var playlistResponse = playlistService.addSong(playlistId, song.getId());

        return ApiResponse.<Map<String, Object>>builder()
                .result(Map.of(
                        "song", songMapper.toResponse(song),
                        "playlist", playlistResponse
                ))
                .message("Đã thêm vào playlist thành công.")
                .build();
    }
}