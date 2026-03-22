package iuh.fit.se.paymentservice.service.impl;

import io.jsonwebtoken.Claims;
import iuh.fit.se.paymentservice.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.paymentservice.dto.response.PaymentResponse;
import iuh.fit.se.paymentservice.dto.response.UserSubscriptionResponse;
import iuh.fit.se.paymentservice.entity.SubscriptionPlan;
import iuh.fit.se.paymentservice.entity.PaymentTransaction;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.enums.PaymentStatus;
import iuh.fit.se.paymentservice.enums.SubscriptionStatus;
import iuh.fit.se.paymentservice.exception.AppException;
import iuh.fit.se.paymentservice.exception.ErrorCode;
import iuh.fit.se.paymentservice.dto.mapper.UserSubscriptionMapper;
import iuh.fit.se.paymentservice.repository.PaymentTransactionRepository;
import iuh.fit.se.paymentservice.repository.SubscriptionPlanRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.service.PayOSService;
import iuh.fit.se.paymentservice.service.UserSubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSubscriptionServiceImpl implements UserSubscriptionService {

    private final UserSubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionMapper subscriptionMapper;
    private final PayOSService payOSService;
    private final PaymentTransactionRepository transactionRepository;
    private final SubscriptionAuthorizationCacheService subscriptionAuthorizationCacheService;

    // ──────────────────────────────────────────────────────────
    // PURCHASE SUBSCRIPTION
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PaymentResponse purchaseSubscription(PurchaseSubscriptionRequest request) {
        UUID userId = getCurrentUserId();

        SubscriptionPlan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));

        if (!plan.getIsActive()) {
            throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_ACTIVE);
        }

        if ("FREE".equalsIgnoreCase(plan.getSubsName())) {
            throw new AppException(ErrorCode.FREE_SUBSCRIPTION_NOT_ALLOWED);
        }

        subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .ifPresent(s -> { throw new AppException(ErrorCode.USER_ALREADY_HAS_ACTIVE_SUBSCRIPTION); });

        return subscriptionRepository
                .findByUserIdAndStatusAndPlanIdAndCreatedAtAfter(
                        userId,
                        SubscriptionStatus.PENDING,
                        request.getPlanId(),
                        LocalDateTime.now().minusMinutes(15))
                .map(existing -> {
                    log.info("Returning existing pending subscription id={} for userId={}", existing.getId(), userId);
                    return transactionRepository.findBySubscriptionIdAndStatus(existing.getId(), PaymentStatus.PENDING)
                            .map(this::toExistingPaymentResponse)
                            .orElseGet(() -> createNewPayment(userId, plan, request));
                })
                .orElseGet(() -> createNewPayment(userId, plan, request));
    }


    private PaymentResponse createNewPayment(UUID userId, SubscriptionPlan plan,
                                             PurchaseSubscriptionRequest request) {
        UserSubscription subscription = UserSubscription.builder()
                .userId(userId)
                .plan(plan)
                .status(SubscriptionStatus.PENDING)
                .startedAt(null)
                .expiresAt(null)
                .autoRenew(Boolean.TRUE.equals(request.getAutoRenew()))
                .build();
        subscription = subscriptionRepository.save(subscription);
        log.info("Created PENDING subscription id={} for userId={}, plan={}", subscription.getId(), userId, plan.getSubsName());
        String userEmail = getCurrentUserEmail();
        return payOSService.createPaymentLink(
                userId,
                userEmail,
                subscription.getId(),
                plan.getSubsName(),
                plan.getPrice(),
                "Get plans " + plan.getSubsName()
        );
    }

    private PaymentResponse toExistingPaymentResponse(PaymentTransaction tx) {
        return PaymentResponse.builder()
                .checkoutUrl(tx.getCheckoutUrl())
                .qrCode(tx.getQrCode())
                .referenceCode(tx.getReferenceCode())
                .orderCode(tx.getOrderCode())
                .message("Existing payment link returned")
                .build();
    }

    // ──────────────────────────────────────────────────────────
    // GET SUBSCRIPTION INFO
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserSubscriptionResponse getMyActiveSubscription() {
        UUID userId = getCurrentUserId();
        // Dùng JOIN FETCH để eager load plan, tránh LazyInitializationException
        UserSubscription sub = subscriptionRepository
                .findActiveWithPlanByUserId(userId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.USER_SUBSCRIPTION_NOT_FOUND));
        return subscriptionMapper.toResponse(sub);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSubscriptionResponse> getMySubscriptionHistory() {
        UUID userId = getCurrentUserId();
        return subscriptionRepository.findAllByUserIdWithPlanOrderByCreatedAtDesc(userId)
                .stream()
                .map(subscriptionMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────
    // CANCEL SUBSCRIPTION
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void cancelSubscription() {
        UUID userId = getCurrentUserId();
        UserSubscription sub = subscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.USER_SUBSCRIPTION_NOT_FOUND));

        sub.setStatus(SubscriptionStatus.CANCELLED);
        sub.setCancelledAt(LocalDateTime.now());
        sub.setAutoRenew(false);
        subscriptionRepository.save(sub);

        log.info("Cancelled subscription id={} for userId={}", sub.getId(), userId);

        subscriptionAuthorizationCacheService.evict(userId);
    }

    // ──────────────────────────────────────────────────────────
    // SCHEDULED: XỬ LÝ SUBSCRIPTION HẾT HẠN
    // ──────────────────────────────────────────────────────────

    @Override
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void processExpiredSubscriptions() {
        List<UserSubscription> expired = subscriptionRepository
                .findExpiredSubscriptions(LocalDateTime.now());

        if (expired.isEmpty()) return;

        log.info("Processing {} expired subscriptions", expired.size());

        for (UserSubscription sub : expired) {
            sub.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);

            subscriptionAuthorizationCacheService.evict(sub.getUserId());

            log.info("Expired subscription id={} for userId={}", sub.getId(), sub.getUserId());
        }
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return UUID.fromString(auth.getPrincipal().toString());
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getCredentials() == null) return null;
        try {
            // JwtAuthenticationFilter lưu toàn bộ Claims vào credentials
            Claims claims = (Claims) auth.getCredentials();
            return claims.get("email", String.class);
        } catch (Exception e) {
            return null;
        }
    }
}
