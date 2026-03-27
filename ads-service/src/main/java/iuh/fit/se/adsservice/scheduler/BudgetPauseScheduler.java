package iuh.fit.se.adsservice.scheduler;

import iuh.fit.se.adsservice.entity.Ad;
import iuh.fit.se.adsservice.enums.AdStatus;
import iuh.fit.se.adsservice.repository.AdRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
@Slf4j
public class BudgetPauseScheduler {

    private static final String LOCK_KEY = "lock:budget-pause-scheduler";
    /** Slightly under fixedRate (300s) so a stalled holder does not block forever */
    private static final Duration LOCK_TTL = Duration.ofSeconds(290);

    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class
    );

    private final AdRepository adRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final TransactionTemplate transactionTemplate;

    public BudgetPauseScheduler(
            AdRepository adRepository,
            StringRedisTemplate stringRedisTemplate,
            PlatformTransactionManager transactionManager) {
        this.adRepository = adRepository;
        this.stringRedisTemplate = stringRedisTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Every 5 minutes: pause any ACTIVE ad whose estimated revenue has reached or exceeded its budget.
     * Only one instance runs the job at a time (Redis lock for scale-out).
     */
    @Scheduled(fixedRate = 300_000)
    public void pauseBudgetExceededAds() {
        String token = UUID.randomUUID().toString();
        Boolean acquired = stringRedisTemplate.opsForValue().setIfAbsent(LOCK_KEY, token, LOCK_TTL);
        if (!Boolean.TRUE.equals(acquired)) {
            log.debug("BudgetPauseScheduler: lock not acquired, skipping (another instance holds {})", LOCK_KEY);
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(status -> pauseBudgetExceededAdsInTransaction());
        } finally {
            stringRedisTemplate.execute(UNLOCK_SCRIPT, Collections.singletonList(LOCK_KEY), token);
        }
    }

    private void pauseBudgetExceededAdsInTransaction() {
        List<Ad> exceeded = adRepository.findBudgetExceededAds(AdStatus.ACTIVE);
        if (exceeded.isEmpty()) return;

        log.info("BudgetPauseScheduler: pausing {} over-budget ads", exceeded.size());
        for (Ad ad : exceeded) {
            ad.setStatus(AdStatus.PAUSED);
            adRepository.save(ad);
            log.info("Paused ad id={} advertiser={} — budget exhausted", ad.getId(), ad.getAdvertiserName());
        }
    }
}
