package iuh.fit.se.adsservice.service;

import iuh.fit.se.adsservice.dto.request.CreateAdRequest;
import iuh.fit.se.adsservice.dto.request.UpdateAdRequest;
import iuh.fit.se.adsservice.dto.response.AdDeliveryResponse;
import iuh.fit.se.adsservice.dto.response.AdResponse;
import iuh.fit.se.adsservice.dto.response.AdStatsResponse;
import iuh.fit.se.adsservice.enums.AdStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

public interface AdService {

    // ── Admin: CRUD ──────────────────────────────────────────────────────────

    AdResponse createAd(CreateAdRequest request, MultipartFile audioFile);

    AdResponse updateAd(UUID adId, UpdateAdRequest request, MultipartFile audioFile);

    void deleteAd(UUID adId);

    AdResponse getAdById(UUID adId);

    Page<AdResponse> getAllAds(AdStatus status, String advertiserName, Pageable pageable);

    // ── Admin: Stats ─────────────────────────────────────────────────────────

    AdStatsResponse getAdStats(UUID adId, LocalDate from, LocalDate to);

    // ── User: delivery ───────────────────────────────────────────────────────

    /**
     * Return the next ad for a user, or null if no ad is due.
     * Checks the Redis session (songCount / sessionStartMs) and resets it after serving.
     */
    AdDeliveryResponse getNextAd(UUID userId);

    /**
     * Record that the user played an ad (creates AdImpression).
     */
    void recordPlayed(UUID adId, UUID userId, UUID songId, boolean completed);

    /**
     * Record that the user clicked an ad (creates AdClick, anti-spam guarded).
     */
    void recordClicked(UUID adId, UUID userId);
}
