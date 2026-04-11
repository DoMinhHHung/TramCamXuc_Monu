package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import iuh.fit.se.musicservice.dto.messaging.AiMusicGenerateMessage;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.service.support.AiMusicMessagePrompts;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SonautoMusicService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${sonauto.api-key:}")
    private String apiKey;

    @Value("${sonauto.base-url:https://api.sonauto.ai/v1}")
    private String baseUrl;

    @Value("${sonauto.poll-interval-ms:3000}")
    private long pollIntervalMs;

    @Value("${sonauto.poll-timeout-ms:900000}")
    private long pollTimeoutMs;

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    public byte[] generate(AiMusicGenerateMessage message) {
        if (!isConfigured()) {
            throw new IllegalStateException("Sonauto API key not configured");
        }

        ObjectNode body = buildV2Body(message);
        String createUrl = trimSlash(baseUrl) + "/generations/v2";
        String taskId = null;
        try {
            HttpHeaders headers = authHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);
            ResponseEntity<String> post = restTemplate.exchange(
                    createUrl, HttpMethod.POST, entity, String.class);
            if (!post.getStatusCode().is2xxSuccessful() || post.getBody() == null) {
                throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
            }
            JsonNode root = objectMapper.readTree(post.getBody());
            taskId = root.path("task_id").asText(null);
            if (!StringUtils.hasText(taskId)) {
                log.error("[Sonauto] missing task_id in response: {}", post.getBody());
                throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
            }
        } catch (HttpStatusCodeException e) {
            throwIfQuotaOrRethrowExternal("create", e);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Sonauto] create request failed", e);
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }

        if (!StringUtils.hasText(taskId)) {
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }

        log.info("[Sonauto] task_id={} — polling…", taskId);
        String statusUrl = trimSlash(baseUrl) + "/generations/" + taskId;
        long deadline = System.currentTimeMillis() + pollTimeoutMs;

        while (System.currentTimeMillis() < deadline) {
            try {
                HttpEntity<Void> getEntity = new HttpEntity<>(authHeaders());
                ResponseEntity<String> resp = restTemplate.exchange(
                        statusUrl, HttpMethod.GET, getEntity, String.class);
                if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                    sleepPoll();
                    continue;
                }
                JsonNode doc = objectMapper.readTree(resp.getBody());
                String status = doc.path("status").asText("").trim();
                if ("SUCCESS".equalsIgnoreCase(status)) {
                    return downloadFirstSong(doc, taskId);
                }
                if ("FAILURE".equalsIgnoreCase(status)) {
                    String err = doc.path("error_message").asText("Sonauto generation failed");
                    log.warn("[Sonauto] FAILURE task_id={} — {}", taskId, err);
                    throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
                }
            } catch (HttpStatusCodeException e) {
                int code = e.getStatusCode().value();
                if (code == 402 || code == 429) {
                    throwIfQuotaOrRethrowExternal("poll", e);
                }
                log.warn("[Sonauto] poll HTTP {} task_id={} — {}", code, taskId, e.getResponseBodyAsString());
            } catch (AppException e) {
                throw e;
            } catch (Exception e) {
                log.warn("[Sonauto] poll error task_id={}: {}", taskId, e.getMessage());
            }
            sleepPoll();
        }

        log.error("[Sonauto] timeout waiting for task_id={}", taskId);
        throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
    }

    private ObjectNode buildV2Body(AiMusicGenerateMessage message) {
        ObjectNode body = objectMapper.createObjectNode();
        String lyrics = message.getLyrics() != null ? message.getLyrics().trim() : "";
        boolean hasLyrics = StringUtils.hasText(lyrics);

        if (hasLyrics) {
            body.put("lyrics", lyrics);
            body.put("prompt", AiMusicMessagePrompts.buildSonautoStylePrompt(message));
            body.put("instrumental", false);
        } else {
            body.set("tags", buildStyleTags(message));
            body.put("prompt", AiMusicMessagePrompts.buildSonautoStylePrompt(message));
            body.put("instrumental", true);
            body.put("bpm", "auto");
        }

        body.put("prompt_strength", 2.0);
        body.put("balance_strength", 0.7);
        body.put("num_songs", 1);
        body.put("output_format", "mp3");
        body.put("output_bit_rate", 128);
        return body;
    }

    private ArrayNode buildStyleTags(AiMusicGenerateMessage message) {
        ArrayNode tags = objectMapper.createArrayNode();
        List<String> names = message.getGenreNames();
        if (names != null) {
            for (String n : names) {
                if (StringUtils.hasText(n)) {
                    tags.add(n.trim());
                }
            }
        }
        if (tags.isEmpty() && StringUtils.hasText(message.getStylePrompt())) {
            for (String part : message.getStylePrompt().split(",")) {
                String t = part.trim();
                if (StringUtils.hasText(t)) {
                    tags.add(t);
                }
            }
        }
        if (tags.isEmpty()) {
            tags.add("pop");
        }
        return tags;
    }

    private byte[] downloadFirstSong(JsonNode doc, String taskId) {
        JsonNode paths = doc.get("song_paths");
        if (paths == null || !paths.isArray() || paths.isEmpty()) {
            log.error("[Sonauto] SUCCESS but no song_paths task_id={}", taskId);
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }
        String url = paths.get(0).asText(null);
        if (!StringUtils.hasText(url)) {
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }
        try {
            ResponseEntity<byte[]> audio = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), byte[].class);
            if (!audio.getStatusCode().is2xxSuccessful() || audio.getBody() == null || audio.getBody().length == 0) {
                throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
            }
            return audio.getBody();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Sonauto] download audio failed task_id={}", taskId, e);
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }
    }

    private HttpHeaders authHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(apiKey.trim());
        return h;
    }

    private void throwIfQuotaOrRethrowExternal(String phase, HttpStatusCodeException e) {
        int code = e.getStatusCode().value();
        if (code == 402 || code == 429) {
            log.warn("[Sonauto] {} HTTP {} — {}", phase, code, e.getResponseBodyAsString());
            throw new AppException(ErrorCode.AI_MUSIC_ELEVENLABS_QUOTA);
        }
        log.error("[Sonauto] {} HTTP {} — {}", phase, code, e.getResponseBodyAsString());
        throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
    }

    private void sleepPoll() {
        try {
            Thread.sleep(pollIntervalMs);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.AI_MUSIC_EXTERNAL_FAILED);
        }
    }

    private static String trimSlash(String u) {
        if (u == null) {
            return "";
        }
        return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
    }
}
