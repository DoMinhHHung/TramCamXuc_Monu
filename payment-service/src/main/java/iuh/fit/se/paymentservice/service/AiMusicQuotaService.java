package iuh.fit.se.paymentservice.service;

import iuh.fit.se.paymentservice.dto.request.InternalAiMusicConsumeRequest;
import iuh.fit.se.paymentservice.dto.response.InternalAiMusicQuotaResponse;

import java.util.UUID;

public interface AiMusicQuotaService {

    InternalAiMusicQuotaResponse getQuota(UUID userId, String periodYm);

    void consume(InternalAiMusicConsumeRequest request);
}
