package iuh.fit.se.musicservice.service;

public interface ElevenLabsMusicService {

    /**
     * Gọi ElevenLabs compose, trả về bytes MP3.
     */
    byte[] composeMusic(String prompt, int musicLengthMs);
}
