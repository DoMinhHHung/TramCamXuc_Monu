package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.AiMusicCreateJobRequest;
import iuh.fit.se.musicservice.dto.response.AiMusicJobResponse;
import iuh.fit.se.musicservice.dto.response.AiMusicQuotaResponse;
import iuh.fit.se.musicservice.dto.response.SongResponse;

import java.util.UUID;

public interface AiMusicJobService {

    void assertAiMusicFeatureEnabled();

    AiMusicQuotaResponse getQuota();

    AiMusicJobResponse createJob(AiMusicCreateJobRequest request);

    AiMusicJobResponse getJob(UUID jobId);

    SongResponse acceptJob(UUID jobId);

    SongResponse keepPrivateJob(UUID jobId);

    void rejectJob(UUID jobId);

    SongResponse finalizeDraftBySongId(UUID songId, boolean publish);
}
