// music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SoundCloudService.java

package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.SourceType;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.repository.SoundCloudTrackResult;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StreamUtils;
import org.springframework.web.util.UriUtils;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
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
    private final SongRepository songRepository;
    private final ArtistRepository artistRepository;
    private final GenreRepository genreRepository;
    private final ObjectMapper objectMapper;

    private volatile String scAccessToken;
    private volatile Instant scTokenExpiry = Instant.EPOCH;

    @Value("${soundcloud.client-id}")
    private String clientId;
    @Value("${soundcloud.client-secret}")
    private String clientSecret;

        @Value("${GATEWAY_URL:http://localhost:8080}")
    private String gatewayUrl;

    private static final String SC_API = "https://api.soundcloud.com";
    private static final UUID SC_SYSTEM_USER = UUID.fromString("00000000-0000-0000-0000-000000000002");

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
        try {
            int safeLimit = Math.max(1, Math.min(limit, 50));
            List<SoundCloudTrackResult> primary = searchTracksOnce(query, safeLimit);

            String normalizedQuery = normalizeSearchQuery(query);
            if (normalizedQuery.equals(query == null ? "" : query.trim())) {
                return primary;
            }

            List<SoundCloudTrackResult> fallback = searchTracksOnce(normalizedQuery, safeLimit);
            return mergeUniqueTracks(primary, fallback, safeLimit);
        } catch (Exception e) {
            log.error("[SoundCloud] Search failed for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<SoundCloudTrackResult> searchTracksOnce(String query, int limit) {
        String url = String.format(
                "%s/tracks?q=%s&limit=%d&linked_partitioning=1",
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

        // SoundCloud API trả về collection hoặc trực tiếp list
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
                // Chỉ lấy track có thể stream (streamable = true)
                if (!Boolean.TRUE.equals(item.get("streamable"))) continue;

                SoundCloudTrackResult track = new SoundCloudTrackResult();
                String urn = (String) item.get("urn");
                String trackId = urn != null && !urn.isBlank()
                    ? urn
                    : String.valueOf(item.get("id"));
                track.setId(trackId);
                track.setUrn(urn != null && !urn.isBlank() ? urn : trackId);
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
                track.setStreamUrl(buildProxyStreamUrl(trackId));

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

    // ── Save to DB (để thêm vào playlist) ───────────────────────────────────

    public Song saveOrGetSoundCloudTrack(String soundcloudId, SoundCloudTrackResult trackData) {
        // Kiểm tra đã tồn tại chưa
        return songRepository.findBySoundcloudId(soundcloudId)
                .orElseGet(() -> {
                    Artist artist = upsertArtist(trackData);
                    Genre genre = resolveGenre(trackData.getGenre());

                    UUID songId = UUID.randomUUID();
                    Song song = Song.builder()
                            .id(songId)
                            .title(trackData.getTitle())
                            .slug(SlugUtils.generate(trackData.getTitle(), songId))
                            .ownerUserId(SC_SYSTEM_USER)
                            .primaryArtistId(artist.getId())
                            .primaryArtistStageName(artist.getStageName())
                            .primaryArtistAvatarUrl(artist.getAvatarUrl())
                            .thumbnailUrl(trackData.getThumbnailUrl())
                            .durationSeconds(trackData.getDurationSeconds())
                            .genres(genre != null ? Set.of(genre) : Collections.emptySet())
                            .status(SongStatus.PUBLIC)
                            .transcodeStatus(TranscodeStatus.COMPLETED)
                            .playCount(trackData.getPlaybackCount())
                            .sourceType(SourceType.SOUNDCLOUD)
                            .soundcloudId(soundcloudId)
                            .soundcloudPermalink(trackData.getPermalink())
                            .soundcloudWaveformUrl(trackData.getWaveformUrl())
                            .soundcloudUsername(trackData.getArtistUsername())
                            .build();

                    log.info("[SoundCloud] Saved new track: id={} title='{}'", soundcloudId, trackData.getTitle());
                    return songRepository.save(song);
                });
    }

    // ── Stream URL ───────────────────────────────────────────────────────────

    /**
     * Trả về stream URL hợp lệ để mobile player dùng.
     * SoundCloud Terms: chỉ dùng để stream, không download.
     */
    public String getStreamUrl(String soundcloudId) {
        return buildProxyStreamUrl(soundcloudId);
    }

    public String resolvePlayableStreamUrl(String soundcloudId) {
        String upstreamUrl = buildUpstreamStreamUrl(soundcloudId);
        ResponseEntity<Map> response = restTemplate.exchange(
                upstreamUrl,
                HttpMethod.GET,
                new HttpEntity<>(buildSoundCloudAuthHeaders()),
                Map.class
        );

        Map<String, Object> data = response.getBody();
        if (data == null) {
            throw new IllegalStateException("SoundCloud streams response is empty for id=" + soundcloudId);
        }

        return firstNonBlank(
                (String) data.get("hls_aac_160_url"),
                (String) data.get("hls_mp3_128_url"),
                (String) data.get("http_mp3_128_url"),
                (String) data.get("preview_mp3_128_url")
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Artist upsertArtist(SoundCloudTrackResult track) {
        String stageName = track.getArtistUsername() != null ?
                track.getArtistUsername().trim() : "Unknown Artist";

        return artistRepository.findByStageNameIgnoreCase(stageName)
                .orElseGet(() -> {
                    UUID artistId = UUID.nameUUIDFromBytes(
                            ("soundcloud-artist:" + track.getArtistId())
                                    .getBytes(StandardCharsets.UTF_8)
                    );
                    Artist newArtist = Artist.builder()
                            .id(artistId)
                            .stageName(stageName)
                            .avatarUrl(track.getArtistAvatarUrl())
                            .isJamendo(false)
                            .userId(null)  // External artist
                            .status(ArtistStatus.ACTIVE)
                            .build();
                    return artistRepository.save(newArtist);
                });
    }

    private Genre resolveGenre(String genreTag) {
        if (genreTag == null || genreTag.isBlank()) return null;
        // Map genre tag thô về canonical genre (tương tự Jamendo worker)
        String canonical = mapToCanonical(genreTag.toLowerCase().trim());
        if (canonical == null) return null;
        String finalCanonical = canonical;
        return genreRepository.findByNameIgnoreCase(canonical)
                .orElseGet(() -> genreRepository.save(
                        Genre.builder().name(finalCanonical).description("From SoundCloud").build()
                ));
    }

    private static final Map<String, String> GENRE_MAP = Map.ofEntries(
            Map.entry("pop", "Pop"), Map.entry("rock", "Rock"),
            Map.entry("hip-hop", "Hip-Hop"), Map.entry("hiphop", "Hip-Hop"),
            Map.entry("electronic", "Electronic"), Map.entry("edm", "Electronic"),
            Map.entry("jazz", "Jazz"), Map.entry("classical", "Classical"),
            Map.entry("r&b", "R&B"), Map.entry("rnb", "R&B"),
            Map.entry("ambient", "Ambient"), Map.entry("lofi", "Lo-fi"),
            Map.entry("folk", "Folk"), Map.entry("country", "Country"),
            Map.entry("reggae", "Reggae"), Map.entry("metal", "Metal"),
            Map.entry("dance", "Dance"), Map.entry("house", "House"),
            Map.entry("indie", "Rock"), Map.entry("alternative", "Rock")
    );

    private String mapToCanonical(String tag) {
        return GENRE_MAP.entrySet().stream()
                .filter(e -> tag.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private String decodeSoundCloudText(String value) {
        if (value == null || value.isBlank()) return value;
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return value;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        throw new IllegalStateException("SoundCloud streams response did not contain a playable URL");
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
                : track.getId();
    }

}