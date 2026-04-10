package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.service.GoogleLyricsImprovementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleLyricsImprovementServiceImpl implements GoogleLyricsImprovementService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${google.api-key:}")
    private String googleApiKey;

    private static final String[] MODELS = {"gemini-2.0-flash", "gemini-1.5-flash"};

    @Override
    public String improveLyrics(String lyrics, String hint) {
        if (!StringUtils.hasText(googleApiKey)) {
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }

        String instruction = """
                You are a professional songwriter and lyric editor.
                Improve the lyrics below for clarity, imagery, rhythm, and emotional impact.
                Preserve the original language of the lyrics (Vietnamese stays Vietnamese, English stays English).
                Keep verse/chorus structure if present (e.g. blank lines between sections).
                Output ONLY the improved lyrics text, no explanations or markdown.
                """;

        if (StringUtils.hasText(hint)) {
            instruction += "\nAdditional direction from the artist: " + hint.trim();
        }

        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode contents = root.putArray("contents");
        ObjectNode content = contents.addObject();
        ArrayNode parts = content.putArray("parts");
        ObjectNode part = parts.addObject();
        part.put("text", instruction + "\n\n---\n\n" + lyrics.trim());

        ObjectNode genCfg = root.putObject("generationConfig");
        genCfg.put("temperature", 0.75);
        genCfg.put("maxOutputTokens", 8192);

        for (String model : MODELS) {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + model + ":generateContent?key=" + googleApiKey.trim();
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<String> entity = new HttpEntity<>(root.toString(), headers);
                ResponseEntity<String> resp = restTemplate.exchange(
                        url, HttpMethod.POST, entity, String.class);
                if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                    continue;
                }
                String text = extractText(resp.getBody());
                if (StringUtils.hasText(text)) {
                    return text.trim();
                }
            } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
                log.debug("[Gemini] model {} not available, next", model);
            } catch (Exception e) {
                log.warn("[Gemini] model {} failed: {}", model, e.getMessage());
            }
        }
        throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
    }

    private String extractText(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return null;
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                return null;
            }
            return parts.get(0).path("text").asText(null);
        } catch (Exception e) {
            log.warn("[Gemini] parse response failed", e);
            return null;
        }
    }
}
