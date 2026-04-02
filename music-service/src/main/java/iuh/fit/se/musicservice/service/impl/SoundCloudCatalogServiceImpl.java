package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import iuh.fit.se.musicservice.dto.response.SoundCloudStreamResponse;
import iuh.fit.se.musicservice.dto.response.SoundCloudTrackResponse;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.service.SoundCloudCatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * SoundCloud Catalog Service — METADATA + STREAM URL ONLY.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * COMPLIANCE CHECKLIST (SoundCloud API Terms of Use):
 *
 * ✅ Credit uploader as creator         → uploaderName trong response
 * ✅ Credit SoundCloud as source        → source="SOUNDCLOUD", attributionText
 * ✅ Backlink to soundcloud.com         → permalinkUrl (client PHẢI render)
 * ✅ Không stream rip / lưu audio       → chỉ trả URL, client stream trực tiếp
 * ✅ Không aggregate với service khác   → SoundCloud tracks hiển thị riêng
 * ✅ Dùng AAC HLS (2025 format)         → hls_aac_160_url / hls_aac_96_url
 * ✅ Dùng URN thay vì numeric id        → urn field (id deprecated June 2025)
 * ✅ Chỉ lấy access=playback tracks     → filter khi search
 * ────────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SoundCloudCatalogServiceImpl implements SoundCloudCatalogService {

    private final RestTemplate restTemplate;

    @Value("${soundcloud.client-id:}")
    private String clientId;

    @Value("${soundcloud.client-secret:}")
    private String clientSecret;

    private static final String API_BASE      = "https://api.soundcloud.com";
    private static final String TOKEN_URL     = "https://secure.soundcloud.com/oauth/token";
    private static final String ATTRIBUTION   = "Music provided by SoundCloud. Stream on SoundCloud.";

    // ── Token cache (client_credentials flow, giống SpotifyCatalogServiceImpl) ──
    private volatile String  accessToken;
    private volatile Instant tokenExpiresAt;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public List<SoundCloudTrackResponse> searchTracks(String keyword, int limit) {
        if (keyword == null || keyword.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String token = ensureAccessToken();
        int safeLimit = Math.max(1, Math.min(limit, 50));

        // Chỉ lấy tracks có access=playback (streamable off-platform)
        String url = API_BASE + "/tracks?q={q}&limit={limit}&access=playback";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class,
                    keyword.trim(),
                    safeLimit
            );

            JsonNode body = response.getBody();
            List<SoundCloudTrackResponse> results = new ArrayList<>();

            if (body == null || !body.isArray()) {
                return results;
            }

            for (JsonNode item : body) {
                // Bỏ qua các track không streamable
                if (!item.path("streamable").asBoolean(false)) {
                    continue;
                }
                String access = item.path("access").asText("blocked");
                if ("blocked".equals(access)) {
                    continue;
                }

                results.add(mapToResponse(item, access));
            }

            return results;

        } catch (RestClientException ex) {
            log.error("SoundCloud track search failed for keyword='{}': {}", keyword, ex.getMessage());
            throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
        }
    }

    @Override
    public SoundCloudStreamResponse getStreamUrl(String trackUrn) {
        if (trackUrn == null || trackUrn.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String token = ensureAccessToken();

        // Lấy thông tin track để build attribution
        JsonNode trackInfo = fetchTrackInfo(trackUrn, token);

        // Lấy stream URLs (HLS AAC format mới nhất)
        String streamsUrl = API_BASE + "/tracks/{urn}/streams";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    streamsUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class,
                    trackUrn
            );

            JsonNode streams = response.getBody();
            if (streams == null) {
                throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
            }

            // Ưu tiên progressive stream cho mobile player (expo-audio), fallback HLS.
            String httpMp3128 = normalizeUrl(streams.path("http_mp3_128_url").asText(null));
            String httpAac160 = normalizeUrl(streams.path("http_aac_160_url").asText(null));
            String hlsAac160  = normalizeUrl(streams.path("hls_aac_160_url").asText(null));
            String hlsAac96   = normalizeUrl(streams.path("hls_aac_96_url").asText(null));

            String primaryStreamRaw = firstNonBlank(httpMp3128, httpAac160, hlsAac160, hlsAac96);
            String fallbackStreamRaw = firstNonBlank(
                    notEqual(httpMp3128, primaryStreamRaw) ? httpMp3128 : null,
                    notEqual(httpAac160, primaryStreamRaw) ? httpAac160 : null,
                    notEqual(hlsAac160, primaryStreamRaw) ? hlsAac160 : null,
                    notEqual(hlsAac96, primaryStreamRaw) ? hlsAac96 : null
            );

            String primaryStream = toClientPlayableUrl(primaryStreamRaw);
            String fallbackStream = toClientPlayableUrl(fallbackStreamRaw);

            if (primaryStream == null) {
                log.warn("No AAC HLS stream available for urn={}", trackUrn);
                throw new AppException(ErrorCode.SOUNDCLOUD_STREAM_NOT_AVAILABLE);
            }

            log.info("[SoundCloud] selected stream urn={} primary={} fallback={}", trackUrn, primaryStream, fallbackStream);

            String uploaderName  = trackInfo.path("user").path("username").asText("Unknown Artist");
            String permalinkUrl  = trackInfo.path("permalink_url").asText("");
            String artworkUrl    = resolveArtworkUrl(trackInfo);
            String title         = trackInfo.path("title").asText("");

            log.info("[SoundCloud] Stream URL resolved for urn={} uploader={}", trackUrn, uploaderName);

            return SoundCloudStreamResponse.builder()
                    .urn(trackUrn)
                    .title(title)
                    .uploaderName(uploaderName)
                    .permalinkUrl(permalinkUrl)
                    .artworkUrl(artworkUrl)
                    .streamUrl(primaryStream)
                    .streamUrlFallback(fallbackStream)
                    .attributionText(ATTRIBUTION)
                    .build();

        } catch (AppException e) {
            throw e;
        } catch (RestClientException ex) {
            log.error("SoundCloud streams endpoint failed for urn={}: {}", trackUrn, ex.getMessage());
            throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private JsonNode fetchTrackInfo(String trackUrn, String token) {
        String url = API_BASE + "/tracks/{urn}";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        try {
            ResponseEntity<JsonNode> res = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class, trackUrn);
            JsonNode body = res.getBody();
            if (body == null || body.isNull()) {
                throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
            }
            return body;
        } catch (RestClientException ex) {
            log.error("SoundCloud fetch track info failed urn={}: {}", trackUrn, ex.getMessage());
            throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
        }
    }

    private SoundCloudTrackResponse mapToResponse(JsonNode item, String access) {
        String urn          = item.path("urn").asText(null);
        String title        = item.path("title").asText("Unknown");
        String permalinkUrl = item.path("permalink_url").asText("");
        String artworkUrl   = resolveArtworkUrl(item);
        int    durationMs   = item.path("duration").asInt(0);
        String genre        = item.path("genre").asText(null);
        int    playbackCount= item.path("playback_count").asInt(0);

        // Uploader info (credit theo ToS)
        String uploaderName      = item.path("user").path("username").asText("Unknown");
        String uploaderAvatarUrl = item.path("user").path("avatar_url").asText(null);

        // Stream URL không có trong search response — client gọi riêng endpoint /stream
        // Chỉ có preview trong search nếu access=preview
        String previewUrl = item.path("preview_url").asText(null);

        return SoundCloudTrackResponse.builder()
                .urn(urn)
                .title(title)
                .uploaderName(uploaderName)
                .uploaderAvatarUrl(uploaderAvatarUrl)
                .permalinkUrl(permalinkUrl)
                .artworkUrl(artworkUrl)
                .durationMs(durationMs)
                .genre(genre)
                .playbackCount(playbackCount > 0 ? playbackCount : null)
                .streamUrl(null)          // client gọi /soundcloud/stream?urn=... để lấy riêng
                .previewUrl(previewUrl)
                .access(access)
                .source("SOUNDCLOUD")
                .attributionText(ATTRIBUTION)
                .build();
    }

    /**
     * Artwork URL mặc định từ SoundCloud là 100x100.
     * Thay bằng 500x500 để UI đẹp hơn.
     */
    private String resolveArtworkUrl(JsonNode item) {
        String url = item.path("artwork_url").asText(null);
        if (url == null) {
            // Fallback về avatar của uploader
            url = item.path("user").path("avatar_url").asText(null);
        }
        if (url != null) {
            // t500x500 là size lớn nhất SoundCloud cung cấp
            url = url.replace("-large.", "-t500x500.");
        }
        return url;
    }

    private String normalizeUrl(String url) {
        if (url == null) return null;
        String trimmed = url.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String... urls) {
        if (urls == null) return null;
        for (String url : urls) {
            String normalized = normalizeUrl(url);
            if (normalized != null) return normalized;
        }
        return null;
    }

    private boolean notEqual(String candidate, String primary) {
        return candidate != null && !candidate.equals(primary);
    }

    private String toClientPlayableUrl(String url) {
        String normalized = normalizeUrl(url);
        if (normalized == null) return null;

        if (!normalized.contains("api.soundcloud.com")) {
            return normalized;
        }

        if (normalized.contains("client_id=")) {
            return normalized;
        }

        if (clientId == null || clientId.isBlank()) {
            return normalized;
        }

        String separator = normalized.contains("?") ? "&" : "?";
        return normalized + separator + "client_id=" + clientId;
    }

    // ── OAuth client_credentials (giống Spotify) ───────────────────────────────

    private String ensureAccessToken() {
        if (clientId == null || clientId.isBlank()
                || clientSecret == null || clientSecret.isBlank()) {
            throw new AppException(ErrorCode.SOUNDCLOUD_INTEGRATION_DISABLED);
        }

        if (accessToken != null && tokenExpiresAt != null
                && Instant.now().isBefore(tokenExpiresAt.minusSeconds(30))) {
            return accessToken;
        }

        synchronized (this) {
            if (accessToken != null && tokenExpiresAt != null
                    && Instant.now().isBefore(tokenExpiresAt.minusSeconds(30))) {
                return accessToken;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            // Basic Auth: Base64(client_id:client_secret)
            String credential = Base64.getEncoder().encodeToString(
                    (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
            headers.set(HttpHeaders.AUTHORIZATION, "Basic " + credential);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "client_credentials");

            try {
                ResponseEntity<JsonNode> response = restTemplate.exchange(
                        TOKEN_URL, HttpMethod.POST,
                        new HttpEntity<>(body, headers), JsonNode.class);

                JsonNode responseBody = response.getBody();
                if (responseBody == null || responseBody.path("access_token").isMissingNode()) {
                    log.error("SoundCloud token response missing access_token");
                    throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
                }

                this.accessToken    = responseBody.path("access_token").asText();
                long expiresIn      = responseBody.path("expires_in").asLong(3600);
                this.tokenExpiresAt = Instant.now().plusSeconds(expiresIn);

                log.info("[SoundCloud] Access token refreshed, expires in {}s", expiresIn);
                return this.accessToken;

            } catch (RestClientException ex) {
                log.error("SoundCloud OAuth token request failed: {}", ex.getMessage());
                throw new AppException(ErrorCode.SOUNDCLOUD_API_ERROR);
            }
        }
    }
}