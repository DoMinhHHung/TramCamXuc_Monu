package iuh.fit.se.payment.service.impl;

import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.event.SubscriptionActiveEvent;
import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.payment.dto.mapper.UserSubscriptionMapper;
import iuh.fit.se.payment.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.payment.dto.response.PaymentResponse;
import iuh.fit.se.payment.dto.response.UserSubscriptionResponse;
import iuh.fit.se.payment.entity.SubscriptionPlan;
import iuh.fit.se.payment.entity.UserSubscription;
import iuh.fit.se.payment.enums.SubscriptionStatus;
import iuh.fit.se.payment.repository.SubscriptionPlanRepository;
import iuh.fit.se.payment.repository.UserSubscriptionRepository;
import iuh.fit.se.payment.service.PayOSService;
import iuh.fit.se.payment.service.UserSubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSubscriptionServiceImpl implements UserSubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final UserSubscriptionMapper subscriptionMapper;
    private final PayOSService payOSService;
    private final ApplicationEventPublisher eventPublisher;

    private static final Map<String, Object> FALLBACK_FREE_FEATURES = Map.of(
            SubscriptionConstants.FEATURE_QUALITY, "128kbps",
            SubscriptionConstants.FEATURE_PLAYLIST_LIMIT, 5,
            SubscriptionConstants.FEATURE_RECOMMENDATION, "basic",
            SubscriptionConstants.FEATURE_NO_ADS, false,
            SubscriptionConstants.FEATURE_OFFLINE, false,
            SubscriptionConstants.FEATURE_CAN_BECOME_ARTIST, false,
            SubscriptionConstants.FEATURE_DOWNLOAD, false
    );

    private UUID getCurrentUserId() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return UUID.fromString(userId);
    }

    @Override
    @Transactional
    public PaymentResponse purchaseSubscription(PurchaseSubscriptionRequest request) {
        UUID userId = getCurrentUserId();

        subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .ifPresent(sub -> {
                    throw new AppException(ErrorCode.USER_ALREADY_HAS_ACTIVE_SUBSCRIPTION);
                });

        SubscriptionPlan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));

        if (!plan.getIsActive()) {
            throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_ACTIVE);
        }

        LocalDateTime now = LocalDateTime.now();
        UserSubscription subscription = UserSubscription.builder()
                .userId(userId)
                .plan(plan)
                .status(SubscriptionStatus.PENDING)
                .startedAt(now)
                .expiresAt(now.plusDays(plan.getDurationDays()))
                .autoRenew(request.getAutoRenew() != null ? request.getAutoRenew() : false)
                .build();

        subscription = subscriptionRepository.save(subscription);

        String description = "Purchase " + plan.getSubsName();

        PaymentResponse paymentResponse = payOSService.createPaymentLink(
                userId,
                subscription.getId(),
                plan.getSubsName(),
                plan.getPrice(),
                description
        );

        log.info("Created subscription and payment for user: {}", userId);

        return paymentResponse;
    }

    @Override
    public UserSubscriptionResponse getMyActiveSubscription() {
        UUID userId = getCurrentUserId();

        UserSubscription subscription = subscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.USER_SUBSCRIPTION_NOT_FOUND));

        return subscriptionMapper.toResponse(subscription);
    }

    @Override
    public List<UserSubscriptionResponse> getMySubscriptionHistory() {
        UUID userId = getCurrentUserId();

        return subscriptionRepository.findAllByUserId(userId)
                .stream()
                .map(subscriptionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void cancelSubscription() {
        UUID userId = getCurrentUserId();

        UserSubscription subscription = subscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.USER_SUBSCRIPTION_NOT_FOUND));

        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscription.setCancelledAt(LocalDateTime.now());
        subscription.setAutoRenew(false);

        subscriptionRepository.save(subscription);
        log.info("Cancelled subscription for user: {}", userId);
    }

    @Override
    @Transactional
//    @Scheduled(cron = "0 0 0 * * *")
    @Scheduled(fixedRate = 60000)
    public void processExpiredSubscriptions() {
        Map<String, Object> freeFeatures = planRepository.findBySubsNameAndIsActiveTrue(SubscriptionConstants.PLAN_FREE)
                .map(SubscriptionPlan::getFeatures)
                .orElse(FALLBACK_FREE_FEATURES);

        List<UserSubscription> expiredSubscriptions =
                subscriptionRepository.findExpiredSubscriptions(LocalDateTime.now());

        for (UserSubscription subscription : expiredSubscriptions) {
            subscription.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(subscription);

            eventPublisher.publishEvent(SubscriptionActiveEvent.builder()
                    .userId(subscription.getUserId())
                    .planName(SubscriptionConstants.PLAN_FREE)
                    .features(freeFeatures)
                    .build());
        }

        log.info("Processed {} expired subscriptions", expiredSubscriptions.size());
    }
}