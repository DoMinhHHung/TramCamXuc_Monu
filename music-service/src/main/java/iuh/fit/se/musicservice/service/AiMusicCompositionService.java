package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.messaging.AiMusicGenerateMessage;

/**
 * Sinh file nhạc (MP3) từ job AI — Sonauto (ưu tiên) hoặc ElevenLabs (dự phòng).
 */
public interface AiMusicCompositionService {

    byte[] composeMusic(AiMusicGenerateMessage message);
}
