package iuh.fit.se.paymentservice.service.impl;

import iuh.fit.se.paymentservice.entity.PaymentTransaction;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.enums.PaymentStatus;
import iuh.fit.se.paymentservice.enums.SubscriptionStatus;
import iuh.fit.se.paymentservice.repository.PaymentTransactionRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationService {

    private static final int STALE_MINUTES = 15;
    private static final int EXPIRE_HOURS = 12;
    private static final int BATCH_SIZE = 20;

    private final PaymentTransactionRepository transactionRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final PayOSServiceImpl payOSService;
    private final PayOS payOS;

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT2M")
    public void reconcilePendingTransactions() {
        LocalDateTime staleThreshold = LocalDateTime.now().minusMinutes(STALE_MINUTES);
        LocalDateTime expireThreshold = LocalDateTime.now().minusHours(EXPIRE_HOURS);

        Page<PaymentTransaction> stalePage = transactionRepository.findAllByStatus(
                PaymentStatus.PENDING, PageRequest.of(0, BATCH_SIZE));

        if (stalePage.isEmpty()) return;

        int checked = 0;
        int reconciled = 0;
        int expired = 0;

        for (PaymentTransaction tx : stalePage.getContent()) {
            if (tx.getCreatedAt() == null || tx.getOrderCode() == null) continue;

            if (tx.getCreatedAt().isAfter(staleThreshold)) continue;

            checked++;

            if (tx.getCreatedAt().isBefore(expireThreshold)) {
                markExpired(tx);
                expired++;
                continue;
            }

            try {
                PaymentLink info = (PaymentLink) payOS.paymentRequests().get(tx.getOrderCode());
                if (info == null) continue;

                PaymentLinkStatus payOsStatus = info.getStatus();
                if (PaymentLinkStatus.PAID == payOsStatus) {
                    processPayOsCompleted(tx, info);
                    reconciled++;
                } else if (PaymentLinkStatus.CANCELLED == payOsStatus || PaymentLinkStatus.EXPIRED == payOsStatus) {
                    markCancelled(tx);
                    reconciled++;
                }
            } catch (Exception e) {
                log.warn("reconciliation_query_failed orderCode={} error={}", tx.getOrderCode(), e.getMessage());
            }
        }

        if (checked > 0) {
            log.info("reconciliation_complete checked={} reconciled={} expired={}", checked, reconciled, expired);
        }
    }

    @Transactional
    protected void processPayOsCompleted(PaymentTransaction tx, PaymentLink info) {
        int updated = transactionRepository.updateFromPendingToCompleted(
                tx.getOrderCode(),
                PaymentStatus.COMPLETED,
                info.getTransactions() != null && !info.getTransactions().isEmpty()
                        ? String.valueOf(info.getTransactions().get(0).getTransactionDateTime())
                        : "reconciled",
                PaymentStatus.PENDING);

        if (updated == 0) {
            log.info("reconciliation_already_processed orderCode={}", tx.getOrderCode());
            return;
        }

        // Reload sau update để có dữ liệu mới nhất
        transactionRepository.findByOrderCode(tx.getOrderCode()).ifPresent(fresh -> {
            if (fresh.getSubscription() != null) {
                UserSubscription sub = fresh.getSubscription();
                LocalDateTime activatedAt = LocalDateTime.now();
                sub.setStatus(SubscriptionStatus.ACTIVE);
                sub.setStartedAt(activatedAt);
                sub.setExpiresAt(activatedAt.plusDays(sub.getPlan().getDurationDays()));
                subscriptionRepository.save(sub);
                payOSService.enqueueSubscriptionActiveEventPublic(fresh.getUserId(), sub);
                payOSService.enqueuePaymentSuccessEmailPublic(fresh, sub);
                log.info("reconciliation_activated userId={} orderCode={}", fresh.getUserId(), tx.getOrderCode());
            }
        });
    }

    @Transactional
    protected void markCancelled(PaymentTransaction tx) {
        int updated = transactionRepository.updateFromPendingToFailed(
                tx.getOrderCode(), PaymentStatus.CANCELLED, PaymentStatus.PENDING);
        if (updated > 0 && tx.getSubscription() != null) {
            UserSubscription sub = tx.getSubscription();
            sub.setStatus(SubscriptionStatus.CANCELLED);
            subscriptionRepository.save(sub);
        }
        log.info("reconciliation_cancelled orderCode={}", tx.getOrderCode());
    }

    @Transactional
    protected void markExpired(PaymentTransaction tx) {
        int updated = transactionRepository.updateFromPendingToFailed(
                tx.getOrderCode(), PaymentStatus.CANCELLED, PaymentStatus.PENDING);
        if (updated > 0 && tx.getSubscription() != null) {
            UserSubscription sub = tx.getSubscription();
            sub.setStatus(SubscriptionStatus.CANCELLED);
            subscriptionRepository.save(sub);
        }
        log.info("reconciliation_expired orderCode={}", tx.getOrderCode());
    }
}
