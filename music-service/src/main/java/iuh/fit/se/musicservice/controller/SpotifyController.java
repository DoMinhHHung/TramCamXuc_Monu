package iuh.fit.se.musicservice.controller;

import iuh.fit.se.musicservice.dto.request.SpotifyRefreshTokenRequest;
import iuh.fit.se.musicservice.dto.request.SpotifyTokenExchangeRequest;
import iuh.fit.se.musicservice.dto.response.ApiResponse;
import iuh.fit.se.musicservice.dto.response.SpotifyOAuthTokenResponse;
import iuh.fit.se.musicservice.dto.response.SpotifyTrackResponse;
import iuh.fit.se.musicservice.service.SpotifyCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/spotify")
@RequiredArgsConstructor
public class SpotifyController {

    private final SpotifyCatalogService spotifyCatalogService;

    /**
     * Search tracks từ Spotify Web API bằng client_credentials flow.
     * Chỉ trả metadata + external link, không re-stream audio.
     */
    @GetMapping("/tracks/search")
    public ApiResponse<List<SpotifyTrackResponse>> searchTracks(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "US") String market
    ) {
        return ApiResponse.<List<SpotifyTrackResponse>>builder()
                .result(spotifyCatalogService.searchTracks(keyword, limit, market))
                .build();
    }

    /**
     * Tạo authorize URL cho Authorization Code + PKCE (dùng cho Web Playback SDK).
     */
    @GetMapping("/oauth/authorize-url")
    public ApiResponse<String> getAuthorizeUrl(
            @RequestParam String redirectUri,
            @RequestParam String codeChallenge,
            @RequestParam(defaultValue = "S256") String codeChallengeMethod,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String scopes
    ) {
        return ApiResponse.<String>builder()
                .result(spotifyCatalogService.buildAuthorizeUrl(redirectUri, state, codeChallenge, codeChallengeMethod, scopes))
                .build();
    }

    /**
     * Đổi authorization code -> access token (PKCE).
     */
    @PostMapping("/oauth/token")
    public ApiResponse<SpotifyOAuthTokenResponse> exchangeToken(@RequestBody SpotifyTokenExchangeRequest request) {
        return ApiResponse.<SpotifyOAuthTokenResponse>builder()
                .result(spotifyCatalogService.exchangeAuthorizationCode(request))
                .build();
    }

    /**
     * Refresh access token cho Spotify Web API/Web Playback SDK.
     */
    @PostMapping("/oauth/refresh")
    public ApiResponse<SpotifyOAuthTokenResponse> refreshToken(@RequestBody SpotifyRefreshTokenRequest request) {
        return ApiResponse.<SpotifyOAuthTokenResponse>builder()
                .result(spotifyCatalogService.refreshAccessToken(request))
                .build();
    }

}
