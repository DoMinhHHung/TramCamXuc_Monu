// music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SoundCloudService.java

package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.repository.SoundCloudTrackResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriUtils;
import org.springframework.web.client.RestTemplate;

import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.text.Normalizer;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SoundCloudService {

    private final RestTemplate restTemplate;

    private volatile String scAccessToken;
    private volatile Instant scTokenExpiry = Instant.EPOCH;

    @Value("${soundcloud.client-id}")
    private String clientId;
    @Value("${soundcloud.client-secret}")
    private String clientSecret;

        @Value("${GATEWAY_URL:http://localhost:8080}")
    private String gatewayUrl;

    private static final String SC_API = "https://api.soundcloud.com";

    private synchronized String getScToken() {
        if (scAccessToken != null && Instant.now().isBefore(scTokenExpiry.minusSeconds(60))) {
            return scAccessToken;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        ResponseEntity<Map> resp = restTemplate.exchange(
            "https://api.soundcloud.com/oauth2/token",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        Map<String, Object> data = resp.getBody();
        if (data == null || data.get("access_token") == null) {
            throw new IllegalStateException("SoundCloud token response missing access_token");
        }

        scAccessToken = String.valueOf(data.get("access_token"));
        Object expiresObj = data.getOrDefault("expires_in", 3600);
        int expiresIn = expiresObj instanceof Number n
                ? n.intValue()
                : Integer.parseInt(String.valueOf(expiresObj));
        scTokenExpiry = Instant.now().plusSeconds(expiresIn);
        return scAccessToken;
    }

    private HttpHeaders buildSoundCloudAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "OAuth " + getScToken());
        return headers;
    }

    private String buildUpstreamStreamUrl(String soundcloudId) {
        String encodedSoundcloudId = UriUtils.encodePathSegment(soundcloudId, StandardCharsets.UTF_8);
        return SC_API + "/tracks/" + encodedSoundcloudId + "/streams";
    }

    private String buildProxyStreamUrl(String soundcloudId) {
        String baseUrl = gatewayUrl.endsWith("/")
                ? gatewayUrl.substring(0, gatewayUrl.length() - 1)
                : gatewayUrl;
        String encodedSoundcloudId = UriUtils.encodePathSegment(soundcloudId, StandardCharsets.UTF_8);
        return baseUrl + "/service-music/external/soundcloud/tracks/" + encodedSoundcloudId + "/proxy";
    }

    // ── Search ────────────────────────────────────────────────────────────────

    
public List<SoundCloudTrackResult> searchTracks(String query, int limit) {
    if (query == null || query.isBlank()) return Collections.emptyList();
    
    int safeLimit = Math.max(1, Math.min(limit, 50));
    String trimmed = query.trim();

    List<SoundCloudTrackResult> primary = searchTracksOnce(trimmed, safeLimit);

    boolean hasDiacritics = !trimmed.equals(normalizeSearchQuery(trimmed));
    if (hasDiacritics && primary.size() < 3) {
        String normalized = normalizeSearchQuery(trimmed);
        List<SoundCloudTrackResult> fallback = searchTracksOnce(normalized, safeLimit);
        return mergeUniqueTracks(primary, fallback, safeLimit);
    }
    
    return primary;
}

    private List<SoundCloudTrackResult> searchTracksOnce(String query, int limit) {
        String url = String.format(
            "%s/tracks?q=%s&limit=%d&linked_partitioning=1&access=playable",
            SC_API,
            URLEncoder.encode(query, StandardCharsets.UTF_8),
            limit
        );

        ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(buildSoundCloudAuthHeaders()),
                Map.class
        );
        return parseSearchResults(response.getBody());
    }

    @SuppressWarnings("unchecked")
    private List<SoundCloudTrackResult> parseSearchResults(Map<String, Object> body) {
        if (body == null) return Collections.emptyList();

        Object collection = body.get("collection");
        List<Map<String, Object>> items;
        if (collection instanceof List) {
            items = (List<Map<String, Object>>) collection;
        } else {
            return Collections.emptyList();
        }

        List<SoundCloudTrackResult> results = new ArrayList<>();
        for (Map<String, Object> item : items) {
            try {
                String trackAccess = (String) item.get("access");
                if (trackAccess != null && trackAccess.equals("blocked")) continue;
                
                SoundCloudTrackResult track = new SoundCloudTrackResult();
                
                String urn = (String) item.get("urn");
                Object idObj = item.get("id");
                String numericId = String.valueOf(idObj);

                track.setId(numericId);
                track.setUrn(urn != null && !urn.isBlank() ? urn : "soundcloud:tracks:" + numericId);
                track.setTitle(decodeSoundCloudText((String) item.get("title")));
                track.setPermalink((String) item.get("permalink_url")); // Attribution link

                Object duration = item.get("duration");
                if (duration instanceof Number n) {
                    track.setDurationSeconds(n.intValue() / 1000);
                }

                // Artwork
                String artworkUrl = (String) item.get("artwork_url");
                if (artworkUrl != null) {
                    // Upgrade to higher resolution: t500x500 thay vì large (100x100)
                    artworkUrl = artworkUrl.replace("-large.", "-t500x500.");
                }
                track.setThumbnailUrl(artworkUrl);

                track.setWaveformUrl((String) item.get("waveform_url"));

                // Stream URL trả về proxy của backend để frontend không cần gắn Authorization header.
                track.setStreamUrl(buildProxyStreamUrl(numericId));

                // User / Artist
                Map<String, Object> user = (Map<String, Object>) item.get("user");
                if (user != null) {
                    track.setArtistUsername(decodeSoundCloudText((String) user.get("username")));
                    track.setArtistPermalink((String) user.get("permalink_url"));
                    String avatarUrl = (String) user.get("avatar_url");
                    if (avatarUrl != null) {
                        avatarUrl = avatarUrl.replace("-large.", "-t200x200.");
                    }
                    track.setArtistAvatarUrl(avatarUrl);
                    track.setArtistId(String.valueOf(user.get("id")));
                }

                // Genre
                track.setGenre((String) item.get("genre"));
                track.setPlaybackCount(item.get("playback_count") instanceof Number n ?
                        n.longValue() : 0L);

                results.add(track);
            } catch (Exception e) {
                log.warn("[SoundCloud] Failed to parse track: {}", e.getMessage());
            }
        }
        return results;
    }

    // ── Stream URL ───────────────────────────────────────────────────────────

    /**
     * Trả về stream URL hợp lệ để mobile player dùng.
     * SoundCloud Terms: chỉ dùng để stream, không download.
     */
    public String getStreamUrl(String soundcloudId) {
        try {
            return resolvePlayableStreamUrl(soundcloudId);
        } catch (Exception e) {
            log.error("[SoundCloud] Failed to resolve stream URL for id={}: {}", soundcloudId, e.getMessage());
            throw new RuntimeException("SoundCloud stream not available", e);
        }
    }

    public String resolvePlayableStreamUrl(String soundcloudId) {
        String numericId = extractNumericId(soundcloudId);
        String upstreamUrl = SC_API + "/tracks/" + numericId + "/streams";

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    upstreamUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(buildSoundCloudAuthHeaders()),
                    Map.class
            );

            Map<String, Object> data = response.getBody();
            if (data == null) {
                throw new IllegalStateException("SoundCloud streams response is empty for id=" + numericId);
            }

            // Ưu tiên HLS AAC (định dạng hiện tại của SoundCloud 2025+),
            // http_mp3_128_url và hls_mp3_128_url đã bị deprecated.
            String intermediateUrl = firstNonBlank(
                    (String) data.get("hls_aac_160_url"),
                    (String) data.get("hls_mp3_128_url"),
                    (String) data.get("http_mp3_128_url"),
                    (String) data.get("preview_mp3_128_url")
            );

            if (intermediateUrl == null) {
                throw new IllegalStateException("SoundCloud streams response did not contain a playable URL");
            }

            // Các URL từ /streams là intermediate API endpoint của SoundCloud,
            // cần follow redirect (với Auth header) để lấy signed CDN URL thực sự.
            // CDN URL (cf-hls-media.sndcdn.com) có thể play trực tiếp mà không cần Auth.
            String cdnUrl = followRedirectToCdnUrl(intermediateUrl, getScToken());
            log.debug("[SoundCloud] Resolved CDN URL for id={}: {}", numericId, cdnUrl);
            return cdnUrl;

        } catch (Exception e) {
            log.error("[SoundCloud] Error resolving stream for {}: {}", numericId, e.getMessage());
            throw e;
        }
    }

    /**
     * Follow HTTP 302 redirect của SoundCloud intermediate URL để lấy signed CDN URL.
     * SoundCloud trả về URL dạng api.soundcloud.com/.../streams/{uuid}/hls — URL này
     * redirect về CDN thực sự (cf-hls-media.sndcdn.com/...) có thể play mà không cần Auth.
     */
    private String followRedirectToCdnUrl(String intermediateUrl, String oauthToken) {
        try {
            HttpURLConnection con = (HttpURLConnection) new URL(intermediateUrl).openConnection();
            con.setInstanceFollowRedirects(false); // tự xử lý redirect để lấy Location header
            con.setRequestMethod("GET");
            con.setRequestProperty("Authorization", "OAuth " + oauthToken);
            con.setConnectTimeout(5000);
            con.setReadTimeout(5000);
            con.connect();

            int status = con.getResponseCode();
            if (status == HttpURLConnection.HTTP_MOVED_TEMP
                    || status == HttpURLConnection.HTTP_MOVED_PERM
                    || status == 307 || status == 308) {
                String location = con.getHeaderField("Location");
                if (location != null && !location.isBlank()) {
                    log.debug("[SoundCloud] Redirect {} → {}", intermediateUrl, location);
                    return location;
                }
            }
            log.warn("[SoundCloud] No redirect from intermediate URL (status={}), using as-is", status);
            return intermediateUrl;
        } catch (Exception e) {
            log.warn("[SoundCloud] Could not follow redirect for {}: {}", intermediateUrl, e.getMessage());
            return intermediateUrl;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String extractNumericId(String soundcloudId) {
        if (soundcloudId == null) return null;
        if (soundcloudId.contains(":")) {
            String[] parts = soundcloudId.split(":");
            return parts[parts.length - 1];
        }
        return soundcloudId;
    }

        // ── Helpers ───────────────────────────────────────────────────────────────

    private String decodeSoundCloudText(String value) {
        if (value == null || value.isBlank()) return value;
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return value;
        }
    }

    private String normalizeSearchQuery(String query) {
        String trimmed = query == null ? "" : query.trim();
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.isBlank() ? trimmed : normalized;
    }

    private List<SoundCloudTrackResult> mergeUniqueTracks(
            List<SoundCloudTrackResult> first,
            List<SoundCloudTrackResult> second,
            int limit
    ) {
        Map<String, SoundCloudTrackResult> merged = new LinkedHashMap<>();
        for (SoundCloudTrackResult track : first) {
            merged.put(trackIdentity(track), track);
        }
        for (SoundCloudTrackResult track : second) {
            merged.putIfAbsent(trackIdentity(track), track);
            if (merged.size() >= limit) break;
        }
        return new ArrayList<>(merged.values()).subList(0, Math.min(limit, merged.size()));
    }

    private String trackIdentity(SoundCloudTrackResult track) {
        return track.getUrn() != null && !track.getUrn().isBlank()
                ? track.getUrn()
                : String.valueOf(track.getId());
    }
}