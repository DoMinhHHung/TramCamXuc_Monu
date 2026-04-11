package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.AiMusicCreateJobRequest;
import iuh.fit.se.musicservice.dto.request.AiMusicFinalizeRequest;
import iuh.fit.se.musicservice.dto.request.ImproveLyricsRequest;
import iuh.fit.se.musicservice.dto.response.AiMusicJobResponse;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.ImproveLyricsResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.service.AiMusicJobService;
import iuh.fit.se.musicservice.service.GoogleLyricsImprovementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Tách khỏi /songs/{songId} để tránh path variable nuốt "ai-music".
 */
@RestController
@RequestMapping("/ai-music")
@RequiredArgsConstructor
public class AiMusicController {

    private final AiMusicJobService aiMusicJobService;
    private final GoogleLyricsImprovementService googleLyricsImprovementService;

    @PostMapping("/improve-lyrics")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<ImproveLyricsResponse> improveLyrics(@Valid @RequestBody ImproveLyricsRequest request) {
        aiMusicJobService.assertAiMusicFeatureEnabled();
        String improved = googleLyricsImprovementService.improveLyrics(
                request.getLyrics(),
                request.getHint());
        return ApiResponse.<ImproveLyricsResponse>builder()
                .result(ImproveLyricsResponse.builder().improvedLyrics(improved).build())
                .message("OK")
                .build();
    }

    @PostMapping("/jobs")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AiMusicJobResponse> createJob(@Valid @RequestBody AiMusicCreateJobRequest request) {
        return ApiResponse.<AiMusicJobResponse>builder()
                .result(aiMusicJobService.createJob(request))
                .message("Job queued")
                .build();
    }

    @GetMapping("/jobs/{jobId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<AiMusicJobResponse> getJob(@PathVariable UUID jobId) {
        return ApiResponse.<AiMusicJobResponse>builder()
                .result(aiMusicJobService.getJob(jobId))
                .build();
    }

    @PostMapping("/jobs/{jobId}/accept")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> accept(@PathVariable UUID jobId) {
        return ApiResponse.<SongResponse>builder()
                .result(aiMusicJobService.acceptJob(jobId))
                .message("Song created, transcoding started")
                .build();
    }

    @PostMapping("/jobs/{jobId}/keep-private")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> keepPrivate(@PathVariable UUID jobId) {
        return ApiResponse.<SongResponse>builder()
                .result(aiMusicJobService.keepPrivateJob(jobId))
                .message("Saved as private, transcoding started")
                .build();
    }

    @PostMapping("/jobs/{jobId}/reject")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<Void> reject(@PathVariable UUID jobId) {
        aiMusicJobService.rejectJob(jobId);
        return ApiResponse.<Void>builder().message("Preview discarded").build();
    }

    /** Finalize bản nháp AI từ Library (publish hoặc chỉ private). */
    @PostMapping("/songs/{songId}/finalize")
    @PreAuthorize("hasRole('ARTIST')")
    public ApiResponse<SongResponse> finalizeDraft(
            @PathVariable UUID songId,
            @Valid @RequestBody AiMusicFinalizeRequest request) {
        return ApiResponse.<SongResponse>builder()
                .result(aiMusicJobService.finalizeDraftBySongId(songId, Boolean.TRUE.equals(request.getPublish())))
                .message("Transcoding started")
                .build();
    }
}
