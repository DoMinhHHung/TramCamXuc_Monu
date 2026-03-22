package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Heart;
import iuh.fit.se.socialservice.dto.response.HeartResponse;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.HeartRepository;
import iuh.fit.se.socialservice.service.HeartService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeartServiceImpl implements HeartService {

    private final HeartRepository heartRepository;

    @Override
    public HeartResponse heartSong(UUID userId, UUID songId) {
        Heart heart = Heart.builder()
                .userId(userId)
                .songId(songId)
                .build();
        try {
            heart = heartRepository.save(heart);
        } catch (DuplicateKeyException e) {
            throw new AppException(ErrorCode.ALREADY_HEARTED);
        }
        long total = heartRepository.countBySongId(songId);
        return toResponse(heart, total);
    }

    @Override
    public void unheartSong(UUID userId, UUID songId) {
        if (!heartRepository.existsByUserIdAndSongId(userId, songId)) {
            throw new AppException(ErrorCode.NOT_HEARTED);
        }
        heartRepository.deleteByUserIdAndSongId(userId, songId);
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
