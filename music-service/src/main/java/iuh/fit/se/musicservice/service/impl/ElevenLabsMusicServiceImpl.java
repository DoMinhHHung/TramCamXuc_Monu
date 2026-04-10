package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.service.ElevenLabsMusicService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElevenLabsMusicServiceImpl implements ElevenLabsMusicService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${elevenlabs.api-key-primary:}")
    private String apiKeyPrimary;

    @Value("${elevenlabs.api-key-secondary:}")
    private String apiKeySecondary;

    private static final String COMPOSE_URL =
            "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128";

    @Override
    public byte[] composeMusic(String prompt, int musicLengthMs) {
        int ms = Math.min(600_000, Math.max(3_000, musicLengthMs));
        ObjectNode body = objectMapper.createObjectNode();
        body.put("prompt", prompt);
        body.put("music_length_ms", ms);
        body.put("force_instrumental", false);
        body.put("model_id", "music_v1");

        byte[] first = tryCompose(apiKeyPrimary, body);
        if (first != null) {
            return first;
        }
        byte[] second = tryCompose(apiKeySecondary, body);
        if (second != null) {
            return second;
        }
        throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
    }

    private byte[] tryCompose(String apiKey, ObjectNode body) {
        if (!StringUtils.hasText(apiKey)) {
            return null;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("xi-api-key", apiKey.trim());

            HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);
            ResponseEntity<byte[]> resp = restTemplate.exchange(
                    COMPOSE_URL,
                    HttpMethod.POST,
                    entity,
                    byte[].class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null || resp.getBody().length == 0) {
                log.warn("[ElevenLabs] empty or non-2xx response");
                return null;
            }
            return resp.getBody();
        } catch (HttpStatusCodeException e) {
            int code = e.getStatusCode().value();
            if (code == 402 || code == 429) {
                log.warn("[ElevenLabs] key exhausted or rate limited ({}), trying fallback", code);
                return null;
            }
            log.error("[ElevenLabs] HTTP {} — {}", code, e.getResponseBodyAsString());
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        } catch (Exception e) {
            log.error("[ElevenLabs] request failed", e);
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }
    }
}
