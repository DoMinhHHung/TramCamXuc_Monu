package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.ArtistRegisterRequest;
import iuh.fit.se.musicservice.dto.request.ArtistUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ArtistResponse;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ArtistService {

    // ── Artist self ────────────────────────────────────────────────────────────

    ArtistResponse registerArtist(ArtistRegisterRequest request);

    /** Lấy profile của chính mình */
    ArtistResponse getMyProfile();

    /** Cập nhật bio / stageName */
    ArtistResponse updateMyProfile(ArtistUpdateRequest request);

    // ── Public / Admin ─────────────────────────────────────────────────────────

    ArtistResponse getArtistById(UUID artistId);

    ArtistResponse getArtistByUserId(UUID userId);

    Page<ArtistResponse> searchArtists(String stageName, ArtistStatus status, Pageable pageable);

    /** Admin: đình chỉ / phục hồi artist */
    ArtistResponse updateStatus(UUID artistId, ArtistStatus status);

    /**
     * Lấy danh sách artists phổ biến.
     * Dùng cho onboarding screen.
     */
    List<ArtistResponse> getPopularArtists(int limit);
}