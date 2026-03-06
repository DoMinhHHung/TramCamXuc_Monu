package iuh.fit.se.musicservice.service.impl;

import io.jsonwebtoken.Claims;
import iuh.fit.se.musicservice.client.IdentityClient;
import iuh.fit.se.musicservice.dto.request.ArtistRegisterRequest;
import iuh.fit.se.musicservice.dto.request.ArtistUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ArtistResponse;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.mapper.ArtistMapper;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.service.ArtistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtistServiceImpl implements ArtistService {

    private final ArtistRepository artistRepository;
    private final ArtistMapper    artistMapper;
    private final IdentityClient  identityClient;

    // ── Helpers ────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private Authentication currentAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    /**
     * Đọc boolean claim từ JWT.
     * identity-service nhúng các feature flags vào token, ví dụ:
     *   "can_become_artist": true
     */
    private boolean getBooleanClaim(String key) {
        try {
            Object creds = currentAuth().getCredentials();
            if (creds instanceof Claims claims) {
                Object val = claims.get(key);
                if (val instanceof Boolean b) return b;
                if (val instanceof String s) return Boolean.parseBoolean(s);
            }
        } catch (Exception ignored) {}
        return false;
    }

    // ── Artist self ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ArtistResponse registerArtist(ArtistRegisterRequest request) {
        UUID userId = currentUserId();

        // 1. Kiểm tra subscription plan có cho phép đăng ký artist không
        if (!getBooleanClaim("can_become_artist")) {
            throw new AppException(ErrorCode.SUBSCRIPTION_NOT_SUPPORTED);
        }

        // 2. Kiểm tra chưa đăng ký artist
        if (artistRepository.existsByUserId(userId)) {
            throw new AppException(ErrorCode.ARTIST_ALREADY_REGISTERED);
        }

        // 3. Kiểm tra stageName chưa tồn tại
        if (artistRepository.existsByStageName(request.getStageName())) {
            throw new AppException(ErrorCode.ARTIST_STAGE_NAME_EXISTS);
        }

        // 4. Tạo artist profile
        Artist artist = Artist.builder()
                .userId(userId)
                .stageName(request.getStageName().trim())
                .bio(request.getBio())
                .status(ArtistStatus.ACTIVE)
                .build();
        artistRepository.save(artist);
        log.info("Artist registered: userId={}, stageName={}", userId, artist.getStageName());

        // 5. Gọi identity-service để thêm ROLE_ARTIST + cấp JWT mới
        //    (synchronous via Feign — service-to-service trong cluster)
        String newToken = null;
        try {
            newToken = identityClient.grantArtistRoleAndIssueToken(userId);
            log.info("New token issued for artist userId={}", userId);
        } catch (Exception e) {
            // Không để lỗi Feign làm rollback: artist đã được tạo thành công.
            // Client có thể dùng /auth/refresh để lấy token mới.
            log.warn("Could not obtain new token from identity-service for userId={}: {}", userId, e.getMessage());
        }

        ArtistResponse response = artistMapper.toResponse(artist);
        if (newToken != null) {
            response.setNewToken(newToken);
        } else {
            response.setHint("Token refresh required: call POST /auth/refresh to receive ROLE_ARTIST");
        }
        return response;
    }

    @Override
    public ArtistResponse getMyProfile() {
        UUID userId = currentUserId();
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return artistMapper.toResponse(artist);
    }

    @Override
    @Transactional
    public ArtistResponse updateMyProfile(ArtistUpdateRequest request) {
        UUID userId = currentUserId();
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        if (artist.getStatus() == ArtistStatus.SUSPENDED) {
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        if (request.getStageName() != null && !request.getStageName().isBlank()) {
            if (artistRepository.existsByStageNameAndIdNot(request.getStageName(), artist.getId())) {
                throw new AppException(ErrorCode.ARTIST_STAGE_NAME_EXISTS);
            }
            artist.setStageName(request.getStageName().trim());
        }

        if (request.getBio() != null) {
            artist.setBio(request.getBio());
        }

        return artistMapper.toResponse(artistRepository.save(artist));
    }

    // ── Public / Admin ─────────────────────────────────────────────────────────

    @Override
    public ArtistResponse getArtistById(UUID artistId) {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return artistMapper.toResponse(artist);
    }

    @Override
    public Page<ArtistResponse> searchArtists(String stageName, ArtistStatus status, Pageable pageable) {
        return artistRepository.searchArtists(stageName, status, pageable)
                .map(artistMapper::toResponse);
    }

    @Override
    @Transactional
    public ArtistResponse updateStatus(UUID artistId, ArtistStatus status) {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        artist.setStatus(status);
        log.info("Admin updated artist {} status to {}", artistId, status);
        return artistMapper.toResponse(artistRepository.save(artist));
    }
}
