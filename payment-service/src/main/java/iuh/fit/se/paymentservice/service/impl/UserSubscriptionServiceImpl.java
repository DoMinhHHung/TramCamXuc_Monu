package iuh.fit.se.paymentservice.service.impl;

import iuh.fit.se.paymentservice.dto.request.PurchaseSubscriptionRequest;
import iuh.fit.se.paymentservice.dto.response.PaymentResponse;
import iuh.fit.se.paymentservice.dto.response.UserSubscriptionResponse;
import iuh.fit.se.paymentservice.entity.SubscriptionPlan;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.enums.SubscriptionStatus;
import iuh.fit.se.paymentservice.exception.AppException;
import iuh.fit.se.paymentservice.exception.ErrorCode;
import iuh.fit.se.paymentservice.dto.mapper.UserSubscriptionMapper;
import iuh.fit.se.paymentservice.repository.SubscriptionPlanRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.service.PayOSService;
import iuh.fit.se.paymentservice.service.UserSubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;
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
    private final SubscriptionAuthorizationCacheService subscriptionAuthorizationCacheService;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final Duration PAYMENT_CACHE_TTL = Duration.ofMinutes(30);
    private static final String USER_SUB_CACHE_PREFIX = "payment:subscriptions:my:";

    // ──────────────────────────────────────────────────────────
    // PURCHASE SUBSCRIPTION
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PaymentResponse purchaseSubscription(PurchaseSubscriptionRequest request) {
        UUID userId = getCurrentUserId();
        evictMyActiveSubscriptionCache(userId);

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

        UserSubscription subscription = UserSubscription.builder()
                .userId(userId)
                .plan(plan)
                .status(SubscriptionStatus.PENDING)
                .startedAt(null)
                .expiresAt(null)
                .autoRenew(request.getAutoRenew() != null && request.getAutoRenew())
                .build();
        subscription = subscriptionRepository.save(subscription);

        log.info("Created PENDING subscription id={} for userId={}, plan={}", 
                subscription.getId(), userId, plan.getSubsName());

        // Lấy email từ JWT claims để lưu vào transaction (dùng gửi email sau khi thanh toán)
        String userEmail = getCurrentUserEmail();

        // Tạo payment link qua PayOS
        String description = " Get plans " + plan.getSubsName();
        return payOSService.createPaymentLink(
                userId,
                userEmail,
                subscription.getId(),
                plan.getSubsName(),
                plan.getPrice(),
                description
        );
    }

    // ──────────────────────────────────────────────────────────
    // GET SUBSCRIPTION INFO
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserSubscriptionResponse getMyActiveSubscription() {
        UUID userId = getCurrentUserId();
        String cacheKey = myActiveSubscriptionCacheKey(userId);
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached instanceof UserSubscriptionResponse cachedResponse) {
            return cachedResponse;
        }

        // Dùng JOIN FETCH để eager load plan, tránh LazyInitializationException
        UserSubscription sub = subscriptionRepository
                .findActiveWithPlanByUserId(userId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.USER_SUBSCRIPTION_NOT_FOUND));
        UserSubscriptionResponse response = subscriptionMapper.toResponse(sub);
        redisTemplate.opsForValue().set(cacheKey, response, PAYMENT_CACHE_TTL);
        return response;
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
        evictMyActiveSubscriptionCache(userId);
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
            evictMyActiveSubscriptionCache(sub.getUserId());

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
        try {
            var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            return attrs.getRequest().getHeader("X-User-Email");
        } catch (Exception e) {
            return null;
        }
    }

    private String myActiveSubscriptionCacheKey(UUID userId) {
        return USER_SUB_CACHE_PREFIX + userId;
    }

    private void evictMyActiveSubscriptionCache(UUID userId) {
        redisTemplate.delete(myActiveSubscriptionCacheKey(userId));
    }
}
