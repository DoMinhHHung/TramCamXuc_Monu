package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Follow;
import iuh.fit.se.socialservice.dto.response.ArtistStatsResponse;
import iuh.fit.se.socialservice.dto.response.FollowResponse;
import iuh.fit.se.socialservice.enums.ReactionType;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.FollowRepository;
import iuh.fit.se.socialservice.repository.ListenHistoryRepository;
import iuh.fit.se.socialservice.repository.ReactionRepository;
import iuh.fit.se.socialservice.repository.SongShareRepository;
import iuh.fit.se.socialservice.service.FollowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowServiceImpl implements FollowService {

    private final FollowRepository followRepository;
    private final ListenHistoryRepository listenHistoryRepository;
    private final ReactionRepository reactionRepository;
    private final SongShareRepository songShareRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private void evictFollowCache(UUID followerId) {
        try {
            redisTemplate.delete("rec:follows:artists:" + followerId);
        } catch (Exception e) {
            // cache eviction is best-effort
        }
    }

    @Override
    public FollowResponse followArtist(UUID followerId, UUID artistId) {
        if (followRepository.existsByFollowerIdAndArtistId(followerId, artistId)) {
            throw new AppException(ErrorCode.ALREADY_FOLLOWING);
        }

        Follow follow = Follow.builder()
                .followerId(followerId)
                .artistId(artistId)
                .build();

        follow = followRepository.save(follow);
        evictFollowCache(followerId);
        return toResponse(follow);
    }

    @Override
    public void unfollowArtist(UUID followerId, UUID artistId) {
        if (!followRepository.existsByFollowerIdAndArtistId(followerId, artistId)) {
            throw new AppException(ErrorCode.NOT_FOLLOWING);
        }
        followRepository.deleteByFollowerIdAndArtistId(followerId, artistId);
        evictFollowCache(followerId);
    }

    @Override
    public boolean isFollowing(UUID followerId, UUID artistId) {
        return followRepository.existsByFollowerIdAndArtistId(followerId, artistId);
    }

    @Override
    public long getFollowerCount(UUID artistId) {
        return followRepository.countByArtistId(artistId);
    }

    @Override
    public Page<FollowResponse> getFollowedArtists(UUID followerId, Pageable pageable) {
        return followRepository.findByFollowerIdOrderByCreatedAtDesc(followerId, pageable)
                .map(this::toResponse);
    }

    @Override
    public Page<FollowResponse> getArtistFollowers(UUID artistId, Pageable pageable) {
        return followRepository.findByArtistIdOrderByCreatedAtDesc(artistId, pageable)
                .map(this::toResponse);
    }

    @Override
    public ArtistStatsResponse getArtistStats(UUID artistId) {
        long followers    = followRepository.countByArtistId(artistId);
        long totalListens = listenHistoryRepository.countByArtistId(artistId);
        long totalLikes   = reactionRepository.countByArtistIdAndType(artistId, ReactionType.LIKE);
        long totalShares  = songShareRepository.countByArtistId(artistId);
        return ArtistStatsResponse.builder()
                .artistId(artistId)
                .followerCount(followers)
                .totalListens(totalListens)
                .totalLikes(totalLikes)
                .totalShares(totalShares)
                .build();
    }

    private FollowResponse toResponse(Follow follow) {
        return FollowResponse.builder()
                .id(follow.getId())
                .followerId(follow.getFollowerId())
                .artistId(follow.getArtistId())
                .createdAt(follow.getCreatedAt())
                .build();
    }
}
