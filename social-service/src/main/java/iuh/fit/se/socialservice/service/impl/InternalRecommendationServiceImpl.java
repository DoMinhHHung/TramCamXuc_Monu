package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.ListenHistory;
import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;
import iuh.fit.se.socialservice.enums.ReactionType;
import iuh.fit.se.socialservice.repository.FollowRepository;
import iuh.fit.se.socialservice.repository.ListenHistoryRepository;
import iuh.fit.se.socialservice.repository.ReactionRepository;
import iuh.fit.se.socialservice.repository.UserFollowRepository;
import iuh.fit.se.socialservice.service.InternalRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InternalRecommendationServiceImpl implements InternalRecommendationService {

    private final ListenHistoryRepository listenHistoryRepository;
    private final FollowRepository        followRepository;
    private final ReactionRepository reactionRepository;
    private final UserFollowRepository    userFollowRepository;

    @Override
    public List<ListenHistoryResponse> getListenHistory(UUID userId, int limit, int days) {
        Instant since = Instant.now().minus(Duration.ofDays(days));
        List<ListenHistory> raw = listenHistoryRepository.findRecentByUserSorted(
                userId, since, PageRequest.of(0, limit));

        return raw.stream().map(h -> ListenHistoryResponse.builder()
                        .id(h.getId())
                        .userId(h.getUserId())
                        .songId(h.getSongId())
                        .artistId(h.getArtistId())
                        .playlistId(h.getPlaylistId())
                        .albumId(h.getAlbumId())
                        .durationSeconds(h.getDurationSeconds())
                        .listenedAt(h.getListenedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getFollowedArtistIds(UUID userId) {
        return followRepository.findArtistIdsByFollowerId(userId).stream()
                .map(f -> f.getArtistId().toString())
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getFollowedUserIds(UUID userId) {
        return userFollowRepository.findFolloweeIdsByFollowerId(userId).stream()
                .map(f -> f.getFolloweeId().toString())
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getLikedSongIds(UUID userId) {
        return reactionRepository.findByUserIdAndType(userId, ReactionType.LIKE)
                .stream()
                .map(r -> r.getSongId().toString())
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getDislikedSongIds(UUID userId) {
        return reactionRepository.findByUserIdAndType(userId, ReactionType.DISLIKE)
                .stream()
                .map(r -> r.getSongId().toString())
                .collect(Collectors.toList());
    }
}