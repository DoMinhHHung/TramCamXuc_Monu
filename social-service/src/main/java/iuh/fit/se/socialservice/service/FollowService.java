package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.ArtistStatsResponse;
import iuh.fit.se.socialservice.dto.response.FollowResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface FollowService {

    FollowResponse followArtist(UUID followerId, UUID artistId);
    void unfollowArtist(UUID followerId, UUID artistId);
    boolean isFollowing(UUID followerId, UUID artistId);
    long getFollowerCount(UUID artistId);
    Page<FollowResponse> getFollowedArtists(UUID followerId, Pageable pageable);
    Page<FollowResponse> getArtistFollowers(UUID artistId, Pageable pageable);
    ArtistStatsResponse getArtistStats(UUID artistId);
}
