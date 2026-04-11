package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.messaging.AiMusicGenerateMessage;
import iuh.fit.se.musicservice.service.AiMusicCompositionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * Thử Sonauto trước (nếu có API key), lỗi hoặc không cấu hình thì dùng ElevenLabs (2 key).
 */
@Service
@Primary
@Slf4j
public class ChainedAiMusicCompositionService implements AiMusicCompositionService {

    private final SonautoMusicService sonautoMusicService;
    private final AiMusicCompositionService elevenLabsBackend;

    public ChainedAiMusicCompositionService(
            SonautoMusicService sonautoMusicService,
            @Qualifier("elevenLabsAiMusic") AiMusicCompositionService elevenLabsBackend) {
        this.sonautoMusicService = sonautoMusicService;
        this.elevenLabsBackend = elevenLabsBackend;
    }

    @Override
    public byte[] composeMusic(AiMusicGenerateMessage message) {
        if (sonautoMusicService.isConfigured()) {
            try {
                return sonautoMusicService.generate(message);
            } catch (Exception ex) {
                log.warn("[AiMusic] Sonauto failed ({}), falling back to ElevenLabs",
                        ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName());
            }
        }
        return elevenLabsBackend.composeMusic(message);
    }
}
