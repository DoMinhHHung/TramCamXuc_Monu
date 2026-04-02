
package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.dto.response.SpotifyTrackResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpotifyService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${spotify.client-id}")
    private String clientId;

    @Value("${spotify.client-secret}")
    private String clientSecret;

    private volatile String accessToken;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    // ── Token Management ──────────────────────────────────────────────────────

    private synchronized String getToken() {
        if (accessToken != null && Instant.now().isBefore(tokenExpiry.minusSeconds(60))) {
            return accessToken;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String credentials = Base64.getEncoder().encodeToString(
                    (clientId + ":" + clientSecret).getBytes());
            headers.set("Authorization", "Basic " + credentials);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "client_credentials");

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://accounts.spotify.com/api/token",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            Map<String, Object> data = response.getBody();
            if (data != null) {
                accessToken = (String) data.get("access_token");
                int expiresIn = (Integer) data.getOrDefault("expires_in", 3600);
                tokenExpiry = Instant.now().plusSeconds(expiresIn);
                log.info("[Spotify] Token refreshed, expires in {}s", expiresIn);
            }
        } catch (Exception e) {
            log.error("[Spotify] Failed to get token: {}", e.getMessage());
            throw new RuntimeException("Spotify token error", e);
        }
        return accessToken;
    }

    // ── Search ────────────────────────────────────────────────────────────────

    public List<SpotifyTrackResult> searchTracks(String query, int limit) {
        try {
            String token = getToken();
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);

            String url = String.format(
                    "https://api.spotify.com/v1/search?q=%s&type=track&limit=%d&market=VN",
                    java.net.URLEncoder.encode(query, "UTF-8"),
                    Math.min(limit, 10)
            );

            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET,
                    new HttpEntity<>(headers), Map.class
            );

            return parseSearchResults(response.getBody());
        } catch (Exception e) {
            log.error("[Spotify] Search failed for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private List<SpotifyTrackResult> parseSearchResults(Map<String, Object> body) {
        if (body == null) return Collections.emptyList();

        Map<String, Object> tracks = (Map<String, Object>) body.get("tracks");
        if (tracks == null) return Collections.emptyList();

        List<Map<String, Object>> items = (List<Map<String, Object>>) tracks.get("items");
        if (items == null) return Collections.emptyList();

        List<SpotifyTrackResult> results = new ArrayList<>();
        for (Map<String, Object> item : items) {
            try {
                SpotifyTrackResult track = new SpotifyTrackResult();
                track.setId((String) item.get("id"));
                track.setName((String) item.get("name"));
                track.setUri((String) item.get("uri")); // spotify:track:xxx

                // Duration
                Object durationMs = item.get("duration_ms");
                if (durationMs instanceof Number n) {
                    track.setDurationSeconds(n.intValue() / 1000);
                }

                // Preview URL (có thể null — hầu hết markets)
                track.setPreviewUrl((String) item.get("preview_url"));

                // External URLs (web player)
                Map<String, Object> externalUrls = (Map<String, Object>) item.get("external_urls");
                if (externalUrls != null) {
                    track.setSpotifyUrl((String) externalUrls.get("spotify"));
                }

                // Artists
                List<Map<String, Object>> artists = (List<Map<String, Object>>) item.get("artists");
                if (artists != null && !artists.isEmpty()) {
                    track.setArtistName((String) artists.get(0).get("name"));
                    Map<String, Object> artistExternal = (Map<String, Object>) artists.get(0).get("external_urls");
                    if (artistExternal != null) {
                        track.setArtistSpotifyUrl((String) artistExternal.get("spotify"));
                    }
                }

                // Album thumbnail
                Map<String, Object> album = (Map<String, Object>) item.get("album");
                if (album != null) {
                    List<Map<String, Object>> images = (List<Map<String, Object>>) album.get("images");
                    if (images != null && !images.isEmpty()) {
                        // Lấy ảnh vừa (index 1 thường là 300x300)
                        int idx = images.size() > 1 ? 1 : 0;
                        track.setThumbnailUrl((String) images.get(idx).get("url"));
                    }
                    track.setAlbumName((String) album.get("name"));
                }

                track.setExplicit(Boolean.TRUE.equals(item.get("explicit")));
                results.add(track);
            } catch (Exception e) {
                log.warn("[Spotify] Failed to parse track item: {}", e.getMessage());
            }
        }
        return results;
    }
}