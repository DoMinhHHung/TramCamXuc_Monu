package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.client.IdentityClient;
import iuh.fit.se.musicservice.client.PaymentInternalClient;
import iuh.fit.se.musicservice.dto.request.ArtistRegisterRequest;
import iuh.fit.se.musicservice.dto.request.ArtistUpdateRequest;
import iuh.fit.se.musicservice.dto.response.ArtistResponse;
import iuh.fit.se.musicservice.dto.response.PaymentSubscriptionStatusResponse;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtistServiceImpl implements ArtistService {

    private static final String REDIS_SUBSCRIPTION_PREFIX = "user:subscription:";
    private static final String FEATURE_CAN_BECOME_ARTIST = "can_become_artist";

    private final ArtistRepository      artistRepository;
    private final ArtistMapper          artistMapper;
    private final IdentityClient        identityClient;
    private final PaymentInternalClient paymentInternalClient;
    private final StringRedisTemplate   stringRedisTemplate;
    private final ObjectMapper          objectMapper;

    // ── Helpers ────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private boolean canBecomeArtist(UUID userId) {
        try {
            String json = stringRedisTemplate.opsForValue()
                    .get(REDIS_SUBSCRIPTION_PREFIX + userId);
            if (json != null) {
                Map<String, Object> features = objectMapper.readValue(
                        json, new TypeReference<>() {});
                Object val = features.get(FEATURE_CAN_BECOME_ARTIST);
                boolean result = val instanceof Boolean b ? b
                        : val instanceof String s && Boolean.parseBoolean(s);
                log.debug("[ArtistRegister] Redis cache hit for userId={}, can_become_artist={}", userId, result);
                return result;
            }
            log.debug("[ArtistRegister] Redis cache miss for userId={}, falling back to payment-service", userId);
        } catch (Exception e) {
            log.warn("[ArtistRegister] Redis read failed for userId={}: {}", userId, e.getMessage());
        }

        try {
            PaymentSubscriptionStatusResponse status =
                    paymentInternalClient.getSubscriptionStatus(userId);
            if (status == null || !status.isActive() || status.getFeatures() == null) {
                return false;
            }
            Object val = status.getFeatures().get(FEATURE_CAN_BECOME_ARTIST);
            boolean result = val instanceof Boolean b ? b
                    : val instanceof String s && Boolean.parseBoolean(s);
            log.debug("[ArtistRegister] Feign fallback for userId={}, can_become_artist={}", userId, result);
            return result;
        } catch (Exception e) {
            log.warn("[ArtistRegister] payment-service Feign call failed for userId={}: {}", userId, e.getMessage());
            return false;
        }
    }

    // ── Artist self ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ArtistResponse registerArtist(ArtistRegisterRequest request) {
        UUID userId = currentUserId();

           if (!canBecomeArtist(userId)) {
            throw new AppException(ErrorCode.SUBSCRIPTION_NOT_SUPPORTED);
        }

        if (artistRepository.existsByUserId(userId)) {
            throw new AppException(ErrorCode.ARTIST_ALREADY_REGISTERED);
        }

        if (artistRepository.existsByStageName(request.getStageName())) {
            throw new AppException(ErrorCode.ARTIST_STAGE_NAME_EXISTS);
        }

        Artist artist = Artist.builder()
                .userId(userId)
                .stageName(request.getStageName().trim())
                .bio(request.getBio())
                .status(ArtistStatus.ACTIVE)
                .build();
        artistRepository.save(artist);
        log.info("Artist registered: userId={}, stageName={}", userId, artist.getStageName());

        String newToken = null;
        try {
            newToken = identityClient.grantArtistRoleAndIssueToken(userId);
            log.info("New token issued for artist userId={}", userId);
        } catch (Exception e) {
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

    @Override
    public List<ArtistResponse> getPopularArtists(int limit) {
        return artistRepository.findPopularArtists(PageRequest.of(0, limit))
                .stream()
                .map(artistMapper::toResponse)
                .collect(Collectors.toList());
    }
}
