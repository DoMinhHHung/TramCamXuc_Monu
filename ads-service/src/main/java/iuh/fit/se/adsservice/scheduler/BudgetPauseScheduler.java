package iuh.fit.se.adsservice.scheduler;

import iuh.fit.se.adsservice.entity.Ad;
import iuh.fit.se.adsservice.enums.AdStatus;
import iuh.fit.se.adsservice.repository.AdRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BudgetPauseScheduler {

    private final AdRepository adRepository;

    /**
     * Every 5 minutes: pause any ACTIVE ad whose estimated revenue has reached or exceeded its budget.
     */
    @Scheduled(fixedRate = 300_000)
    @Transactional
    public void pauseBudgetExceededAds() {
        List<Ad> exceeded = adRepository.findBudgetExceededAds();
        if (exceeded.isEmpty()) return;

        log.info("BudgetPauseScheduler: pausing {} over-budget ads", exceeded.size());
        for (Ad ad : exceeded) {
            ad.setStatus(AdStatus.PAUSED);
            adRepository.save(ad);
            log.info("Paused ad id={} advertiser={} — budget exhausted", ad.getId(), ad.getAdvertiserName());
        }
    }
}
