package iuh.fit.se.paymentservice.service.impl;

import iuh.fit.se.paymentservice.dto.request.InternalAiMusicConsumeRequest;
import iuh.fit.se.paymentservice.dto.response.InternalAiMusicQuotaResponse;
import iuh.fit.se.paymentservice.entity.UserAiMusicUsage;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.repository.UserAiMusicUsageRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.service.AiMusicQuotaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiMusicQuotaServiceImpl implements AiMusicQuotaService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final UserAiMusicUsageRepository userAiMusicUsageRepository;

    private static final int DEFAULT_MAX_GENERATIONS = 5;
    private static final int DEFAULT_MAX_DURATION_SEC = 120;
    private static final int DEFAULT_MAX_TOTAL_MINUTES = 30;

    @Override
    @Transactional(readOnly = true)
    public InternalAiMusicQuotaResponse getQuota(UUID userId, String periodYm) {
        PlanAiLimits limits = resolveLimits(userId);
        if (!limits.enabled()) {
            return InternalAiMusicQuotaResponse.builder()
                    .enabled(false)
                    .periodYm(periodYm)
                    .maxGenerationsPerMonth(0)
                    .maxDurationSeconds(0)
                    .maxTotalMinutesPerMonth(0)
                    .usedGenerations(0)
                    .usedTotalSeconds(0)
                    .remainingGenerations(0)
                    .remainingTotalSeconds(0)
                    .build();
        }

        int usedGen = 0;
        int usedSec = 0;
        var usageOpt = userAiMusicUsageRepository.findByUserIdAndPeriodYm(userId, periodYm);
        if (usageOpt.isPresent()) {
            UserAiMusicUsage u = usageOpt.get();
            usedGen = u.getGenerationCount();
            usedSec = u.getTotalDurationSeconds();
        }

        int maxTotalSec = limits.maxTotalMinutesPerMonth() * 60;
        int remGen = Math.max(0, limits.maxGenerationsPerMonth() - usedGen);
        int remSec = Math.max(0, maxTotalSec - usedSec);

        return InternalAiMusicQuotaResponse.builder()
                .enabled(true)
                .periodYm(periodYm)
                .maxGenerationsPerMonth(limits.maxGenerationsPerMonth())
                .maxDurationSeconds(limits.maxDurationSeconds())
                .maxTotalMinutesPerMonth(limits.maxTotalMinutesPerMonth())
                .usedGenerations(usedGen)
                .usedTotalSeconds(usedSec)
                .remainingGenerations(remGen)
                .remainingTotalSeconds(remSec)
                .build();
    }

    @Override
    @Transactional
    public void consume(InternalAiMusicConsumeRequest request) {
        PlanAiLimits limits = resolveLimits(request.getUserId());
        if (!limits.enabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AI music not enabled for plan");
        }

        UUID userId = request.getUserId();
        String ym = request.getPeriodYm();
        int durationSeconds = request.getDurationSeconds();

        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                consumeLocked(userId, ym, durationSeconds, limits);
                return;
            } catch (DataIntegrityViolationException e) {
                log.warn("[AiMusicQuota] concurrent insert for user {} period {} — retry", userId, ym);
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Could not record AI music usage");
    }

    private void consumeLocked(UUID userId, String ym, int durationSeconds, PlanAiLimits limits) {
        UserAiMusicUsage row;
        var locked = userAiMusicUsageRepository.findByUserIdAndPeriodYmForUpdate(userId, ym);
        if (locked.isEmpty()) {
            try {
                userAiMusicUsageRepository.save(UserAiMusicUsage.builder()
                        .userId(userId)
                        .periodYm(ym)
                        .generationCount(0)
                        .totalDurationSeconds(0)
                        .build());
            } catch (DataIntegrityViolationException ignored) {
                // concurrent insert — row exists now
            }
            row = userAiMusicUsageRepository.findByUserIdAndPeriodYmForUpdate(userId, ym)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Usage row missing"));
        } else {
            row = locked.get();
        }

        if (row.getGenerationCount() >= limits.maxGenerationsPerMonth()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "AI music generation quota exceeded");
        }

        int maxTotalSec = limits.maxTotalMinutesPerMonth() * 60;
        if (row.getTotalDurationSeconds() + durationSeconds > maxTotalSec) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "AI music monthly duration quota exceeded");
        }

        row.setGenerationCount(row.getGenerationCount() + 1);
        row.setTotalDurationSeconds(row.getTotalDurationSeconds() + durationSeconds);
        userAiMusicUsageRepository.save(row);
    }

    private PlanAiLimits resolveLimits(UUID userId) {
        LocalDateTime now = LocalDateTime.now();
        List<UserSubscription> actives = userSubscriptionRepository.findActiveWithPlanByUserId(userId);
        UserSubscription sub = actives.stream()
                .filter(s -> s.getExpiresAt() != null && s.getExpiresAt().isAfter(now))
                .findFirst()
                .orElse(null);

        if (sub == null || sub.getPlan() == null || sub.getPlan().getFeatures() == null) {
            return new PlanAiLimits(false, 0, 0, 0);
        }

        Map<String, Object> f = sub.getPlan().getFeatures();
        boolean artistOk = truthy(f.get("can_become_artist"));
        boolean aiOk = truthy(f.get("ai_music_enabled"));
        if (!artistOk || !aiOk) {
            return new PlanAiLimits(false, 0, 0, 0);
        }

        int maxGen = intFeature(f, "ai_music_generations_per_month", DEFAULT_MAX_GENERATIONS);
        int maxDur = intFeature(f, "ai_music_max_duration_seconds", DEFAULT_MAX_DURATION_SEC);
        int maxMin = intFeature(f, "ai_music_max_minutes_per_month", DEFAULT_MAX_TOTAL_MINUTES);

        maxDur = Math.min(600, Math.max(3, maxDur));
        maxGen = Math.max(0, maxGen);
        maxMin = Math.max(1, maxMin);

        return new PlanAiLimits(true, maxGen, maxDur, maxMin);
    }

    private static boolean truthy(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof String s) {
            return "true".equalsIgnoreCase(s) || "1".equals(s);
        }
        if (v instanceof Number n) {
            return n.intValue() != 0;
        }
        return false;
    }

    private static int intFeature(Map<String, Object> f, String key, int defaultVal) {
        Object v = f.get(key);
        if (v instanceof Number n) {
            return n.intValue();
        }
        if (v instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
                return defaultVal;
            }
        }
        return defaultVal;
    }

    private record PlanAiLimits(boolean enabled, int maxGenerationsPerMonth, int maxDurationSeconds,
                                int maxTotalMinutesPerMonth) {}
}
