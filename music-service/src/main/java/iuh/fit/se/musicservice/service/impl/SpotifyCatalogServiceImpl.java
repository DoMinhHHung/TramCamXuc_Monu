package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import iuh.fit.se.musicservice.dto.request.SpotifyRefreshTokenRequest;
import iuh.fit.se.musicservice.dto.request.SpotifyTokenExchangeRequest;
import iuh.fit.se.musicservice.dto.response.SpotifyOAuthTokenResponse;
import iuh.fit.se.musicservice.dto.response.SpotifyTrackResponse;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.service.SpotifyCatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpotifyCatalogServiceImpl implements SpotifyCatalogService {

    private final RestTemplate restTemplate;

    @Value("${spotify.client-id:}")
    private String clientId;

    @Value("${spotify.client-secret:}")
    private String clientSecret;

    private volatile String accessToken;
    private volatile Instant tokenExpiresAt;

    @Override
    public List<SpotifyTrackResponse> searchTracks(String keyword, int limit, String market) {
        if (keyword == null || keyword.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        String token = ensureAccessToken();

        String safeMarket = (market == null || market.isBlank()) ? "US" : market.trim().toUpperCase();
        String queryUrl = "https://api.spotify.com/v1/search?type=track&q={keyword}&limit={limit}&market={market}";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    queryUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class,
                    keyword,
                    Math.max(1, Math.min(limit, 50)),
                    safeMarket
            );

            JsonNode items = response.getBody() == null
                    ? null
                    : response.getBody().path("tracks").path("items");

            List<SpotifyTrackResponse> results = new ArrayList<>();
            if (items == null || !items.isArray()) {
                return results;
            }

            for (JsonNode item : items) {
                String imageUrl = null;
                JsonNode images = item.path("album").path("images");
                if (images.isArray() && !images.isEmpty()) {
                    imageUrl = images.get(0).path("url").asText(null);
                }

                String artistName = "Unknown Artist";
                JsonNode artists = item.path("artists");
                if (artists.isArray() && !artists.isEmpty()) {
                    artistName = artists.get(0).path("name").asText("Unknown Artist");
                }

                results.add(SpotifyTrackResponse.builder()
                        .id(item.path("id").asText())
                        .name(item.path("name").asText())
                        .artistName(artistName)
                        .albumName(item.path("album").path("name").asText())
                        .imageUrl(imageUrl)
                        .previewUrl(item.path("preview_url").isNull() ? null : item.path("preview_url").asText(null))
                        .externalUrl(item.path("external_urls").path("spotify").asText(null))
                        .spotifyUri(item.path("uri").asText(null))
                        .durationMs(item.path("duration_ms").asInt())
                        .explicit(item.path("explicit").asBoolean(false))
                        .source("SPOTIFY")
                        .ownershipText("Music metadata and artwork are provided by Spotify")
                        .build());
            }

            return results;
        } catch (RestClientException ex) {
            log.error("Spotify track search failed", ex);
            throw new AppException(ErrorCode.SPOTIFY_API_ERROR);
        }
    }



    @Override
    public String buildAuthorizeUrl(String redirectUri, String state, String codeChallenge, String codeChallengeMethod, String scopes) {
        if (clientId == null || clientId.isBlank()) {
            throw new AppException(ErrorCode.SPOTIFY_INTEGRATION_DISABLED);
        }
        if (redirectUri == null || redirectUri.isBlank() || codeChallenge == null || codeChallenge.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String safeScopes = (scopes == null || scopes.isBlank())
                ? "streaming user-read-email user-read-private"
                : scopes.trim();
        String safeMethod = (codeChallengeMethod == null || codeChallengeMethod.isBlank())
                ? "S256"
                : codeChallengeMethod.trim();

        return UriComponentsBuilder
                .fromHttpUrl("https://accounts.spotify.com/authorize")
                .queryParam("response_type", "code")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", safeScopes)
                .queryParam("state", state == null ? "" : state)
                .queryParam("code_challenge_method", safeMethod)
                .queryParam("code_challenge", codeChallenge)
                .build(true)
                .toUriString();
    }

    @Override
    public SpotifyOAuthTokenResponse exchangeAuthorizationCode(SpotifyTokenExchangeRequest request) {
        if (request == null || isBlank(request.getCode()) || isBlank(request.getRedirectUri()) || isBlank(request.getCodeVerifier())) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", request.getCode());
        body.add("redirect_uri", request.getRedirectUri());
        body.add("code_verifier", request.getCodeVerifier());

        return requestOAuthToken(body);
    }

    @Override
    public SpotifyOAuthTokenResponse refreshAccessToken(SpotifyRefreshTokenRequest request) {
        if (request == null || isBlank(request.getRefreshToken())) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", request.getRefreshToken());

        return requestOAuthToken(body);
    }

    private SpotifyOAuthTokenResponse requestOAuthToken(MultiValueMap<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basicCredential());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "https://accounts.spotify.com/api/token",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    JsonNode.class
            );

            JsonNode b = response.getBody();
            if (b == null || b.path("access_token").isMissingNode()) {
                throw new AppException(ErrorCode.SPOTIFY_API_ERROR);
            }

            return SpotifyOAuthTokenResponse.builder()
                    .accessToken(b.path("access_token").asText(null))
                    .tokenType(b.path("token_type").asText(null))
                    .expiresIn(b.path("expires_in").asInt(0))
                    .refreshToken(b.path("refresh_token").isMissingNode() ? null : b.path("refresh_token").asText(null))
                    .scope(b.path("scope").asText(null))
                    .build();
        } catch (RestClientException ex) {
            log.error("Spotify OAuth token request failed", ex);
            throw new AppException(ErrorCode.SPOTIFY_API_ERROR);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String basicCredential() {
        if (isBlank(clientId) || isBlank(clientSecret)) {
            throw new AppException(ErrorCode.SPOTIFY_INTEGRATION_DISABLED);
        }
        return Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
    }

    private String ensureAccessToken() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new AppException(ErrorCode.SPOTIFY_INTEGRATION_DISABLED);
        }
        if (accessToken != null && tokenExpiresAt != null && Instant.now().isBefore(tokenExpiresAt.minusSeconds(15))) {
            return accessToken;
        }

        synchronized (this) {
            if (accessToken != null && tokenExpiresAt != null && Instant.now().isBefore(tokenExpiresAt.minusSeconds(15))) {
                return accessToken;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basicCredential());

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "client_credentials");

            try {
                ResponseEntity<JsonNode> response = restTemplate.exchange(
                        "https://accounts.spotify.com/api/token",
                        HttpMethod.POST,
                        new HttpEntity<>(body, headers),
                        JsonNode.class
                );

                JsonNode responseBody = response.getBody();
                if (responseBody == null || responseBody.path("access_token").isMissingNode()) {
                    throw new AppException(ErrorCode.SPOTIFY_API_ERROR);
                }

                this.accessToken = responseBody.path("access_token").asText();
                long expiresInSeconds = responseBody.path("expires_in").asLong(3600);
                this.tokenExpiresAt = Instant.now().plusSeconds(expiresInSeconds);
                return this.accessToken;
            } catch (RestClientException ex) {
                log.error("Spotify token request failed", ex);
                throw new AppException(ErrorCode.SPOTIFY_API_ERROR);
            }
        }
    }
}
