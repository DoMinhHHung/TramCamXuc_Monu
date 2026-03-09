package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.dto.UserProfileDto;

import java.util.UUID;

public interface UserProfileService {

    /**
     * Lấy profile của user (có cache Redis 10 phút).
     */
    UserProfileDto buildProfile(UUID userId);

    /**
     * Xóa cache khi có sự kiện mới (nghe bài, follow, ...).
     */
    void invalidateCache(UUID userId);
}