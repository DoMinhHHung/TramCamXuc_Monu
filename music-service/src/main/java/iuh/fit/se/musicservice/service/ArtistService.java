package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.ArtistRegisterRequest;
import iuh.fit.se.musicservice.dto.request.ArtistUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ArtistResponse;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ArtistService {

    // ── Artist self ────────────────────────────────────────────────────────────

    /**
     * Đăng ký artist profile.
     * Điều kiện: JWT phải chứa can_become_artist = true (subscription tier).
     * Sau khi thành công, identity-service cấp lại JWT mới với ROLE_ARTIST
     * → trả về trong ArtistResponse.newToken để client dùng ngay, không cần đăng nhập lại.
     */
    ArtistResponse registerArtist(ArtistRegisterRequest request);

    /** Lấy profile của chính mình */
    ArtistResponse getMyProfile();

    /** Cập nhật bio / stageName */
    ArtistResponse updateMyProfile(ArtistUpdateRequest request);

    // ── Public / Admin ─────────────────────────────────────────────────────────

    ArtistResponse getArtistById(UUID artistId);

    Page<ArtistResponse> searchArtists(String stageName, ArtistStatus status, Pageable pageable);

    /** Admin: đình chỉ / phục hồi artist */
    ArtistResponse updateStatus(UUID artistId, ArtistStatus status);
}
