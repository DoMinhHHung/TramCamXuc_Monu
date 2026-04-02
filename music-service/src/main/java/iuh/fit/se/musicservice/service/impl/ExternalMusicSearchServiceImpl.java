package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.enums.TrackSource;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.service.ExternalMusicSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalMusicSearchServiceImpl implements ExternalMusicSearchService {

    private final RestTemplate restTemplate;

    @Value("${spotify.client-id:}")
    private String spotifyClientId;

    @Value("${spotify.client-secret:}")
    private String spotifyClientSecret;

    @Value("${soundcloud.client-id:}")
    private String soundcloudClientId;

    @Override
    public List<SongResponse> search(String keyword, int limit) {
        if (keyword == null || keyword.isBlank()) return List.of();

        int perSourceLimit = Math.max(1, limit / 2);
        List<SongResponse> merged = new ArrayList<>();
        merged.addAll(searchSpotify(keyword.trim(), perSourceLimit));
        merged.addAll(searchSoundCloud(keyword.trim(), perSourceLimit));
        return merged;
    }

    private List<SongResponse> searchSpotify(String keyword, int limit) {
        if (spotifyClientId == null || spotifyClientId.isBlank()
                || spotifyClientSecret == null || spotifyClientSecret.isBlank()) {
            return List.of();
        }

        try {
            String token = spotifyAccessToken();
            if (token == null || token.isBlank()) return List.of();

            String uri = UriComponentsBuilder
                    .fromHttpUrl("https://api.spotify.com/v1/search")
                    .queryParam("q", keyword)
                    .queryParam("type", "track")
                    .queryParam("limit", limit)
                    .build()
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            JsonNode root = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class).getBody();
            JsonNode items = root == null ? null : root.path("tracks").path("items");
            if (items == null || !items.isArray()) return List.of();

            List<SongResponse> out = new ArrayList<>();
            for (JsonNode item : items) {
                String trackId = item.path("id").asText("");
                if (trackId.isBlank()) continue;
                String artistName = item.path("artists").isArray() && item.path("artists").size() > 0
                        ? item.path("artists").get(0).path("name").asText("Spotify Artist")
                        : "Spotify Artist";
                String artistIdRaw = item.path("artists").isArray() && item.path("artists").size() > 0
                        ? item.path("artists").get(0).path("id").asText(trackId)
                        : trackId;
                String image = null;
                JsonNode images = item.path("album").path("images");
                if (images.isArray() && images.size() > 0) {
                    image = images.get(0).path("url").asText(null);
                }

                out.add(SongResponse.builder()
                        .id(deterministicUuid("spotify:" + trackId))
                        .title(item.path("name").asText("Unknown title"))
                        .thumbnailUrl(image)
                        .durationSeconds(item.path("duration_ms").asInt(0) / 1000)
                        .playCount(0L)
                        .status(null)
                        .transcodeStatus(TranscodeStatus.COMPLETED)
                        .deleted(false)
                        .primaryArtist(SongResponse.ArtistInfo.builder()
                                .artistId(deterministicUuid("spotify-artist:" + artistIdRaw))
                                .stageName(artistName)
                                .avatarUrl(null)
                                .build())
                        .genres(null)
                        .source(TrackSource.SPOTIFY)
                        .externalTrackId(trackId)
                        .externalUrl(item.path("external_urls").path("spotify").asText(null))
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());
            }
            return out;
        } catch (Exception e) {
            log.warn("Spotify search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<SongResponse> searchSoundCloud(String keyword, int limit) {
        if (soundcloudClientId == null || soundcloudClientId.isBlank()) {
            return List.of();
        }

        try {
            String uri = UriComponentsBuilder
                    .fromHttpUrl("https://api-v2.soundcloud.com/search/tracks")
                    .queryParam("q", keyword)
                    .queryParam("client_id", soundcloudClientId)
                    .queryParam("limit", limit)
                    .build()
                    .toUriString();

            JsonNode root = restTemplate.getForObject(uri, JsonNode.class);
            JsonNode items = root == null ? null : root.path("collection");
            if (items == null || !items.isArray()) return List.of();

            List<SongResponse> out = new ArrayList<>();
            for (JsonNode item : items) {
                String trackId = item.path("id").asText("");
                if (trackId.isBlank()) continue;
                JsonNode userNode = item.path("user");
                String artistName = userNode.path("username").asText("SoundCloud Artist");
                String artistIdRaw = userNode.path("id").asText(trackId);

                out.add(SongResponse.builder()
                        .id(deterministicUuid("soundcloud:" + trackId))
                        .title(item.path("title").asText("Unknown title"))
                        .thumbnailUrl(item.path("artwork_url").asText(null))
                        .durationSeconds(item.path("duration").asInt(0) / 1000)
                        .playCount(0L)
                        .status(null)
                        .transcodeStatus(TranscodeStatus.COMPLETED)
                        .deleted(false)
                        .primaryArtist(SongResponse.ArtistInfo.builder()
                                .artistId(deterministicUuid("soundcloud-artist:" + artistIdRaw))
                                .stageName(artistName)
                                .avatarUrl(userNode.path("avatar_url").asText(null))
                                .build())
                        .genres(null)
                        .source(TrackSource.SOUNDCLOUD)
                        .externalTrackId(trackId)
                        .externalUrl(item.path("permalink_url").asText(null))
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());
            }
            return out;
        } catch (Exception e) {
            log.warn("SoundCloud search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private String spotifyAccessToken() {
        String auth = Base64.getEncoder().encodeToString(
                (spotifyClientId + ":" + spotifyClientSecret).getBytes(StandardCharsets.UTF_8)
        );
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + auth);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        JsonNode response = restTemplate.exchange(
                "https://accounts.spotify.com/api/token",
                HttpMethod.POST,
                new HttpEntity<>("grant_type=client_credentials", headers),
                JsonNode.class
        ).getBody();

        return response == null ? null : response.path("access_token").asText(null);
    }

    private UUID deterministicUuid(String input) {
        return UUID.nameUUIDFromBytes(Objects.requireNonNullElse(input, "").getBytes(StandardCharsets.UTF_8));
    }
}
