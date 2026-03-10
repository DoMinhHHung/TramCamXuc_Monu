package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.HeartResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface HeartService {
    HeartResponse heartSong(UUID userId, UUID songId);
    void unheartSong(UUID userId, UUID songId);
    boolean isHearted(UUID userId, UUID songId);
    long getHeartCount(UUID songId);
    Page<HeartResponse> getUserHearts(UUID userId, Pageable pageable);
}
