package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;

import java.util.List;
import java.util.UUID;

public interface InternalRecommendationService {

    List<ListenHistoryResponse> getListenHistory(UUID userId, int limit, int days);

    List<String> getFollowedArtistIds(UUID userId);

    List<String> getFollowedUserIds(UUID userId);

    List<String> getLikedSongIds(UUID userId);

    List<String> getDislikedSongIds(UUID userId);
}