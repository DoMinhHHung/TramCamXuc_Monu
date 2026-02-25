package iuh.fit.se.social.service;

import iuh.fit.se.social.dto.response.ArtistSocialStatsResponse;
import java.util.UUID;

public interface FollowService {
    void toggleFollow(UUID artistId);
    ArtistSocialStatsResponse getArtistStats(UUID artistId);
}