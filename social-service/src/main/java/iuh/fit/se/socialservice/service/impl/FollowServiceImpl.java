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
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
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

    private static final int    FAMOUS_THRESHOLD  = 500;
    private static final String FAMOUS_ARTISTS_KEY = "social:famous:artists";

    @PostConstruct
    public void rebuildFamousArtistsCache() {
        try {
            log.info("Rebuilding famous artists cache from MongoDB...");

            redisTemplate.delete(FAMOUS_ARTISTS_KEY);

            List<UUID> famousArtistIds = followRepository.findArtistIdsWithFollowerCountGte(
                    FAMOUS_THRESHOLD);

            if (famousArtistIds.isEmpty()) {
                log.info("No famous artists found at startup.");
                return;
            }

            String[] ids = famousArtistIds.stream()
                    .map(UUID::toString)
                    .toArray(String[]::new);
            redisTemplate.opsForSet().add(FAMOUS_ARTISTS_KEY, (Object[]) ids);

            log.info("Rebuilt famous artists cache: {} artists added.", famousArtistIds.size());
        } catch (Exception e) {
            log.warn("Failed to rebuild famous artists cache: {}", e.getMessage());
        }
    }

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
        updateFamousStatus(artistId);
        return toResponse(follow);
    }

    @Override
    public void unfollowArtist(UUID followerId, UUID artistId) {
        if (!followRepository.existsByFollowerIdAndArtistId(followerId, artistId)) {
            throw new AppException(ErrorCode.NOT_FOLLOWING);
        }
        followRepository.deleteByFollowerIdAndArtistId(followerId, artistId);
        evictFollowCache(followerId);
        updateFamousStatus(artistId);
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

    private void updateFamousStatus(UUID artistId) {
        try {
            long count = followRepository.countByArtistId(artistId);
            if (count >= FAMOUS_THRESHOLD) {
                redisTemplate.opsForSet().add(FAMOUS_ARTISTS_KEY, artistId.toString());
            } else {
                redisTemplate.opsForSet().remove(FAMOUS_ARTISTS_KEY, artistId.toString());
            }
        } catch (Exception e) {
            log.warn("Failed to update famous status for artistId={}: {}",
                    artistId, e.getMessage());
        }
    }
}
