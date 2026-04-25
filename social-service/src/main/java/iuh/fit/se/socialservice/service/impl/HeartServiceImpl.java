package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Heart;
import iuh.fit.se.socialservice.dto.response.HeartResponse;
import iuh.fit.se.socialservice.event.EngagementEventPublisher;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.HeartRepository;
import iuh.fit.se.socialservice.service.HeartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeartServiceImpl implements HeartService {

    private final HeartRepository heartRepository;
    private final EngagementEventPublisher engagementPublisher;

    @Override
    public HeartResponse heartSong(UUID userId, UUID songId) {
        if (heartRepository.existsByUserIdAndSongId(userId, songId)) {
            throw new AppException(ErrorCode.ALREADY_HEARTED);
        }
        Heart heart = Heart.builder()
                .userId(userId)
                .songId(songId)
                .build();
        heart = heartRepository.save(heart);
        long total = heartRepository.countBySongId(songId);
        engagementPublisher.publish(songId, userId, EngagementEventPublisher.EngagementType.HEART);
        return toResponse(heart, total);
    }

    @Override
    public void unheartSong(UUID userId, UUID songId) {
        if (!heartRepository.existsByUserIdAndSongId(userId, songId)) {
            throw new AppException(ErrorCode.NOT_HEARTED);
        }
        heartRepository.deleteByUserIdAndSongId(userId, songId);
        engagementPublisher.publish(songId, userId, EngagementEventPublisher.EngagementType.UN_HEART);
    }

    @Override
    public boolean isHearted(UUID userId, UUID songId) {
        return heartRepository.existsByUserIdAndSongId(userId, songId);
    }

    @Override
    public long getHeartCount(UUID songId) {
        return heartRepository.countBySongId(songId);
    }

    @Override
    public Page<HeartResponse> getUserHearts(UUID userId, Pageable pageable) {
        return heartRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(h -> toResponse(h, heartRepository.countBySongId(h.getSongId())));
    }

    @Override
    public List<UUID> getUserHeartedSongIds(UUID userId) {
        return heartRepository.findByUserId(userId).stream()
                .map(Heart::getSongId)
                .toList();
    }

    @Override
    public Map<UUID, Boolean> checkHeartedBatch(UUID userId, List<UUID> songIds) {
        Set<UUID> hearted = heartRepository.findByUserId(userId).stream()
                .map(Heart::getSongId)
                .collect(Collectors.toSet());
        return songIds.stream().collect(Collectors.toMap(id -> id, hearted::contains));
    }

    private HeartResponse toResponse(Heart heart, long total) {
        return HeartResponse.builder()
                .id(heart.getId())
                .userId(heart.getUserId())
                .songId(heart.getSongId())
                .totalHearts(total)
                .createdAt(heart.getCreatedAt())
                .build();
    }
}
