package iuh.fit.se.music.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.music.dto.request.ArtistUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.event.ArtistRegisteredEvent;
import iuh.fit.se.core.exception.*;
import iuh.fit.se.music.dto.request.ArtistRegisterRequest;
import iuh.fit.se.music.dto.response.ArtistResponse;
import iuh.fit.se.music.entity.Artist;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.mapper.ArtistMapper;
import iuh.fit.se.music.repository.ArtistRepository;
import iuh.fit.se.music.service.ArtistService;
import iuh.fit.se.core.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RequiredArgsConstructor
@Service
@Slf4j
public class ArtistServiceImpl implements ArtistService {
    private final ArtistRepository artistRepository;
    private final ArtistMapper artistMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;
    private final StorageService storageService;

    private void checkSubscriptionPermission(Authentication authentication) {
        Object credentials = authentication.getCredentials();

        if (credentials instanceof Map) {
            Map<String, Object> claims = (Map<String, Object>) credentials;
            Object featuresObj = claims.get("features");

            if (featuresObj == null) {
                throw new AppException(ErrorCode.SUBSCRIPTION_NOT_SUPPORTED);
            }

            try {
                Map<String, Object> features;
                if (featuresObj instanceof String) {
                    features = objectMapper.readValue((String) featuresObj, Map.class);
                } else if (featuresObj instanceof Map) {
                    features = (Map<String, Object>) featuresObj;
                } else {
                    throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
                }

                boolean canBecomeArtist = Boolean.TRUE.equals(features.get(SubscriptionConstants.FEATURE_CAN_BECOME_ARTIST));

                if (!canBecomeArtist) {
                    throw new AppException(ErrorCode.FREE_SUBSCRIPTION_NOT_ALLOWED);
                }

            } catch (Exception e) {
                log.error("Error parsing subscription features", e);
                throw new AppException(ErrorCode.SUBSCRIPTION_NOT_SUPPORTED);
            }
        } else {
            log.error("Authentication credentials missing or invalid type");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
    }

    @Override
    @Transactional
    public ArtistResponse registerArtist(ArtistRegisterRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        checkSubscriptionPermission(authentication);

        if (artistRepository.existsByUserId(userId)) {
            throw new AppException(ErrorCode.ARTIST_ALREADY_REGISTERED);
        }
        if (artistRepository.existsByStageName(request.getStageName())) {
            throw new AppException(ErrorCode.ARTIST_STAGE_NAME_EXISTS);
        }

        Artist artist = artistMapper.toEntity(request);
        artist.setUserId(userId);
        artist.setStatus(ArtistStatus.ACTIVE);

        artist = artistRepository.save(artist);

        eventPublisher.publishEvent(new ArtistRegisteredEvent(userId));
        log.info("Artist registered: {} - Event published to update Role", artist.getStageName());

        return artistMapper.toResponse(artist);
    }

    @Override
    public ArtistResponse getMyProfile() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return artistMapper.toResponse(artist);
    }

    @Override
    public ArtistResponse getProfileByUserId(UUID userId) {
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
        return artistMapper.toResponse(artist);
    }

    @Override
    @Transactional
    public ArtistResponse updateProfile(ArtistUpdateRequest request) {
        Artist artist = getArtistByContext();

        if (artist.getStatus() != ArtistStatus.ACTIVE) {
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        if (request.getStageName() != null && !request.getStageName().equals(artist.getStageName())) {
            if (artistRepository.existsByStageName(request.getStageName())) {
                throw new AppException(ErrorCode.ARTIST_STAGE_NAME_EXISTS);
            }
            artist.setStageName(request.getStageName());
        }

        if (request.getBio() != null) {
            artist.setBio(request.getBio());
        }

        return artistMapper.toResponse(artistRepository.save(artist));
    }

    @Override
    @Transactional
    public ArtistResponse uploadAvatar(MultipartFile file) {
        Artist artist = getArtistByContext();

        if (artist.getStatus() != ArtistStatus.ACTIVE) {
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_FILE);
        }

        String newAvatarUrl = storageService.uploadImage(file, "artists/avatars");
        if (artist.getAvatarUrl() != null && !artist.getAvatarUrl().isEmpty()) {
            try {
                storageService.deleteImage(artist.getAvatarUrl());
            } catch (Exception e) {
                log.warn("Failed to delete old avatar: {}", artist.getAvatarUrl());
            }
        }

        artist.setAvatarUrl(newAvatarUrl);
        return artistMapper.toResponse(artistRepository.save(artist));
    }

    @Override
    @Transactional
    public void toggleArtistStatus(UUID artistId, ArtistStatus status) {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        if (status == ArtistStatus.EXPIRED_SUBSCRIPTION) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        artist.setStatus(status);
        artistRepository.save(artist);
        log.info("Admin updated artist {} status to {}", artistId, status);
    }

    @Override
    public Page<ArtistResponse> getArtistsForAdmin(String stageName, ArtistStatus status, Pageable pageable) {
        return artistRepository.searchArtists(stageName, status, pageable)
                .map(artistMapper::toResponse);
    }

    private Artist getArtistByContext() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());
        return artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));
    }
}
