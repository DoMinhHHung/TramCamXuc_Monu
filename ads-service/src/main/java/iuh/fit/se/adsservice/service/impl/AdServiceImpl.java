package iuh.fit.se.adsservice.service.impl;

import iuh.fit.se.adsservice.dto.request.CreateAdRequest;
import iuh.fit.se.adsservice.dto.request.UpdateAdRequest;
import iuh.fit.se.adsservice.dto.response.AdDeliveryResponse;
import iuh.fit.se.adsservice.dto.response.AdResponse;
import iuh.fit.se.adsservice.dto.response.AdStatsResponse;
import iuh.fit.se.adsservice.entity.Ad;
import iuh.fit.se.adsservice.entity.AdClick;
import iuh.fit.se.adsservice.entity.AdImpression;
import iuh.fit.se.adsservice.enums.AdStatus;
import iuh.fit.se.adsservice.repository.AdClickRepository;
import iuh.fit.se.adsservice.repository.AdImpressionRepository;
import iuh.fit.se.adsservice.repository.AdRepository;
import iuh.fit.se.adsservice.service.AdService;
import iuh.fit.se.adsservice.service.AdSessionService;
import iuh.fit.se.adsservice.service.MinioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdServiceImpl implements AdService {

    private static final int CLICK_ANTI_SPAM_LIMIT = 3;
    private static final int CLICK_WINDOW_SECONDS  = 60;

    private final AdRepository           adRepository;
    private final AdImpressionRepository impressionRepository;
    private final AdClickRepository      clickRepository;
    private final AdSessionService       sessionService;
    private final MinioService           minioService;

    private final Random random = new Random();

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: CRUD
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AdResponse createAd(CreateAdRequest request, MultipartFile audioFile) {
        if (audioFile == null || audioFile.isEmpty())
            throw new IllegalArgumentException("Audio file is required");
        if (!isAudioFile(audioFile))
            throw new IllegalArgumentException("Only MP3 audio files are accepted");

        Ad ad = Ad.builder()
                .advertiserName(request.getAdvertiserName())
                .title(request.getTitle())
                .description(request.getDescription())
                .targetUrl(request.getTargetUrl())
                .cpmVnd(request.getCpmVnd())
                .budgetVnd(request.getBudgetVnd())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(AdStatus.ACTIVE)
                .totalImpressions(0L)
                .totalClicks(0L)
                .build();

        ad = adRepository.save(ad);

        String audioKey = minioService.uploadAudioFile(audioFile, ad.getId());
        ad.setAudioFileKey(audioKey);
        ad.setDurationSeconds(request.getDurationSeconds() != null ? request.getDurationSeconds() : 30);

        ad = adRepository.save(ad);
        log.info("Created ad id={} advertiser={}", ad.getId(), ad.getAdvertiserName());
        return toResponse(ad);
    }

    @Override
    @Transactional
    public AdResponse updateAd(UUID adId, UpdateAdRequest request, MultipartFile audioFile) {
        Ad ad = findOrThrow(adId);

        if (request.getAdvertiserName()  != null) ad.setAdvertiserName(request.getAdvertiserName());
        if (request.getTitle()           != null) ad.setTitle(request.getTitle());
        if (request.getDescription()     != null) ad.setDescription(request.getDescription());
        if (request.getTargetUrl()       != null) ad.setTargetUrl(request.getTargetUrl());
        if (request.getCpmVnd()          != null) ad.setCpmVnd(request.getCpmVnd());
        if (request.getBudgetVnd()       != null) ad.setBudgetVnd(request.getBudgetVnd());
        if (request.getStartDate()       != null) ad.setStartDate(request.getStartDate());
        if (request.getEndDate()         != null) ad.setEndDate(request.getEndDate());
        if (request.getStatus()          != null) ad.setStatus(request.getStatus());
        if (request.getDurationSeconds() != null) ad.setDurationSeconds(request.getDurationSeconds());

        if (audioFile != null && !audioFile.isEmpty()) {
            if (!isAudioFile(audioFile))
                throw new IllegalArgumentException("Only MP3 audio files are accepted");
            minioService.deleteAudioFile(ad.getAudioFileKey());
            ad.setAudioFileKey(minioService.uploadAudioFile(audioFile, ad.getId()));
        }

        ad = adRepository.save(ad);
        log.info("Updated ad id={}", ad.getId());
        return toResponse(ad);
    }

    @Override
    @Transactional
    public void deleteAd(UUID adId) {
        Ad ad = findOrThrow(adId);
        ad.setStatus(AdStatus.ARCHIVED);
        adRepository.save(ad);
        log.info("Archived ad id={}", adId);
    }

    @Override
    public AdResponse getAdById(UUID adId) {
        return toResponse(findOrThrow(adId));
    }

    @Override
    public Page<AdResponse> getAllAds(AdStatus status, String advertiserName, Pageable pageable) {
        Page<Ad> page;
        if (status != null && advertiserName != null) {
            page = adRepository.findByStatusAndAdvertiserNameContainingIgnoreCase(status, advertiserName, pageable);
        } else if (status != null) {
            page = adRepository.findByStatus(status, pageable);
        } else if (advertiserName != null) {
            page = adRepository.findByAdvertiserNameContainingIgnoreCase(advertiserName, pageable);
        } else {
            page = adRepository.findAll(pageable);
        }
        return page.map(this::toResponse);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: STATS
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public AdStatsResponse getAdStats(UUID adId, LocalDate from, LocalDate to) {
        Ad ad = findOrThrow(adId);

        Long impressionsInRange = null;
        Long clicksInRange      = null;

        if (from != null && to != null) {
            LocalDateTime start = from.atStartOfDay();
            LocalDateTime end   = to.plusDays(1).atStartOfDay();
            impressionsInRange  = impressionRepository.countByAdIdAndPlayedAtBetween(adId, start, end);
            clicksInRange       = clickRepository.countByAdIdAndClickedAtBetween(adId, start, end);
        }

        BigDecimal revenue = ad.getEstimatedRevenueVnd();
        BigDecimal budgetUsedPct = BigDecimal.ZERO;
        if (ad.getBudgetVnd() != null && ad.getBudgetVnd().compareTo(BigDecimal.ZERO) > 0) {
            budgetUsedPct = revenue
                    .divide(ad.getBudgetVnd(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        return AdStatsResponse.builder()
                .id(ad.getId())
                .advertiserName(ad.getAdvertiserName())
                .title(ad.getTitle())
                .status(ad.getStatus())
                .cpmVnd(ad.getCpmVnd())
                .budgetVnd(ad.getBudgetVnd())
                .estimatedRevenueVnd(revenue)
                .budgetUsedPercent(budgetUsedPct)
                .totalImpressions(ad.getTotalImpressions())
                .totalClicks(ad.getTotalClicks())
                .ctr(ad.getCtr())
                .impressionsInRange(impressionsInRange)
                .clicksInRange(clicksInRange)
                .startDate(ad.getStartDate())
                .endDate(ad.getEndDate())
                .createdAt(ad.getCreatedAt())
                .updatedAt(ad.getUpdatedAt())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER: DELIVERY
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public AdDeliveryResponse getNextAd(UUID userId) {
        if (!sessionService.isAdDue(userId)) return null;

        List<Ad> eligible = adRepository.findAllEligible(LocalDate.now());
        if (eligible.isEmpty()) {
            sessionService.resetSession(userId);
            return null;
        }

        Ad ad = eligible.get(random.nextInt(eligible.size()));
        sessionService.resetSession(userId);

        String audioUrl = minioService.getPresignedUrl(ad.getAudioFileKey());
        log.info("Serving ad id={} advertiser={} to userId={}", ad.getId(), ad.getAdvertiserName(), userId);

        return AdDeliveryResponse.builder()
                .adId(ad.getId())
                .advertiserName(ad.getAdvertiserName())
                .title(ad.getTitle())
                .description(ad.getDescription())
                .audioUrl(audioUrl)
                .targetUrl(ad.getTargetUrl())
                .durationSeconds(ad.getDurationSeconds())
                .build();
    }

    @Override
    @Transactional
    public void recordPlayed(UUID adId, UUID userId, UUID songId, boolean completed) {
        findOrThrow(adId);

        // playedAt is @CreatedDate — set manually here since we build the object explicitly
        impressionRepository.save(AdImpression.builder()
                .adId(adId)
                .userId(userId)
                .songId(songId)
                .completed(completed)
                .playedAt(LocalDateTime.now())
                .build());

        adRepository.incrementImpressions(adId);
        log.debug("Recorded impression adId={} userId={} completed={}", adId, userId, completed);
    }

    @Override
    @Transactional
    public void recordClicked(UUID adId, UUID userId) {
        findOrThrow(adId);

        // Anti-spam: max CLICK_ANTI_SPAM_LIMIT clicks per user per minute
        LocalDateTime windowStart = LocalDateTime.now().minusSeconds(CLICK_WINDOW_SECONDS);
        long recentClicks = clickRepository.countByAdIdAndUserIdAndClickedAtAfter(adId, userId, windowStart);
        if (recentClicks >= CLICK_ANTI_SPAM_LIMIT) {
            log.warn("Click anti-spam triggered: adId={} userId={}", adId, userId);
            return;
        }

        // clickedAt is @CreatedDate — set manually since builder bypasses JPA lifecycle
        clickRepository.save(AdClick.builder()
                .adId(adId)
                .userId(userId)
                .clickedAt(LocalDateTime.now())
                .build());

        adRepository.incrementClicks(adId);
        log.debug("Recorded click adId={} userId={}", adId, userId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Ad findOrThrow(UUID adId) {
        return adRepository.findById(adId)
                .orElseThrow(() -> new IllegalArgumentException("Ad not found: " + adId));
    }

    private AdResponse toResponse(Ad ad) {
        String audioUrl = ad.getAudioFileKey() != null
                ? minioService.getPresignedUrl(ad.getAudioFileKey())
                : null;
        return AdResponse.builder()
                .id(ad.getId())
                .advertiserName(ad.getAdvertiserName())
                .title(ad.getTitle())
                .description(ad.getDescription())
                .targetUrl(ad.getTargetUrl())
                .audioUrl(audioUrl)
                .audioFileKey(ad.getAudioFileKey())
                .durationSeconds(ad.getDurationSeconds())
                .status(ad.getStatus())
                .cpmVnd(ad.getCpmVnd())
                .budgetVnd(ad.getBudgetVnd())
                .estimatedRevenueVnd(ad.getEstimatedRevenueVnd())
                .ctr(ad.getCtr())
                .totalImpressions(ad.getTotalImpressions())
                .totalClicks(ad.getTotalClicks())
                .startDate(ad.getStartDate())
                .endDate(ad.getEndDate())
                .createdAt(ad.getCreatedAt())
                .updatedAt(ad.getUpdatedAt())
                .build();
    }

    private boolean isAudioFile(MultipartFile file) {
        String ct = file.getContentType();
        return ct != null && (ct.startsWith("audio/") || ct.equals("application/octet-stream"));
    }
}
