package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.SpotifyRefreshTokenRequest;
import iuh.fit.se.musicservice.dto.request.SpotifyTokenExchangeRequest;
import iuh.fit.se.musicservice.dto.response.SpotifyOAuthTokenResponse;
import iuh.fit.se.musicservice.dto.response.SpotifyTrackResponse;

import java.util.List;

public interface SpotifyCatalogService {
    List<SpotifyTrackResponse> searchTracks(String keyword, int limit, String market);

    String buildAuthorizeUrl(String redirectUri, String state, String codeChallenge, String codeChallengeMethod, String scopes);

    SpotifyOAuthTokenResponse exchangeAuthorizationCode(SpotifyTokenExchangeRequest request);

    SpotifyOAuthTokenResponse refreshAccessToken(SpotifyRefreshTokenRequest request);
}
