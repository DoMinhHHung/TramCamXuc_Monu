package iuh.fit.se.paymentservice.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.paymentservice.config.RabbitMQConfig;
import iuh.fit.se.paymentservice.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.paymentservice.dto.request.SubscriptionPlanUpdateRequest;
import iuh.fit.se.paymentservice.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.paymentservice.entity.SubscriptionPlan;
import iuh.fit.se.paymentservice.event.FreePlanResponseEvent;
import iuh.fit.se.paymentservice.exception.AppException;
import iuh.fit.se.paymentservice.exception.ErrorCode;
import iuh.fit.se.paymentservice.dto.mapper.SubscriptionPlanMapper;
import iuh.fit.se.paymentservice.outbox.OutboxEvent;
import iuh.fit.se.paymentservice.outbox.OutboxEventRepository;
import iuh.fit.se.paymentservice.outbox.OutboxEventTypes;
import iuh.fit.se.paymentservice.repository.SubscriptionPlanRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.service.SubscriptionPlanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionPlanServiceImpl implements SubscriptionPlanService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanMapper planMapper;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String ACTIVE_PLAN_CACHE_KEY = "payment:subscriptions:plans:active";
    private static final Duration PAYMENT_CACHE_TTL = Duration.ofMinutes(30);

    // ──────────────────────────────────────────────────────────
    // CREATE
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public SubscriptionPlanResponse createPlan(SubscriptionPlanRequest request) {
        if (planRepository.existsBySubsName(request.getSubsName())) {
            throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS);
        }

        SubscriptionPlan plan = planMapper.toEntity(request);
        if (plan.getIsActive() == null)      plan.setIsActive(true);
        if (plan.getDisplayOrder() == null)  plan.setDisplayOrder(0);

        plan = planRepository.save(plan);
        evictActivePlansCache();
        log.info("Created subscription plan: id={}, name={}", plan.getId(), plan.getSubsName());
        return planMapper.toResponse(plan);
    }

    // ──────────────────────────────────────────────────────────
    // UPDATE
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public SubscriptionPlanResponse updatePlan(UUID id, SubscriptionPlanUpdateRequest request) {
        SubscriptionPlan plan = getPlanOrThrow(id);

        // Kiểm tra tên trùng (nếu đổi tên)
        if (request.getSubsName() != null
                && !plan.getSubsName().equals(request.getSubsName())
                && planRepository.existsBySubsName(request.getSubsName())) {
            throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS);
        }

        // Partial update (bỏ qua field null)
        planMapper.partialUpdate(request, plan);

        // Merge features — không xoá key cũ, chỉ thêm/sửa key mới
        if (request.getFeatures() != null) {
            Map<String, Object> merged = new HashMap<>(
                    plan.getFeatures() != null ? plan.getFeatures() : Map.of()
            );
            merged.putAll(request.getFeatures());
            plan.setFeatures(merged);
        }

        plan = planRepository.save(plan);
        evictActivePlansCache();
        log.info("Updated subscription plan: id={}", id);

        // Nếu update FREE plan → broadcast config mới sang identity-service
        if ("FREE".equals(plan.getSubsName())) {
            broadcastFreePlan(plan);
        }

        return planMapper.toResponse(plan);
    }

    // ──────────────────────────────────────────────────────────
    // DELETE / TOGGLE
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void deletePlan(UUID id) {
        SubscriptionPlan plan = getPlanOrThrow(id);

        Long activeCount = subscriptionRepository.countActiveSubscriptionsByPlan(id);
        if (activeCount > 0) {
            throw new AppException(ErrorCode.CANNOT_DELETE_PLAN_WITH_ACTIVE_SUBSCRIPTIONS);
        }

        planRepository.delete(plan);
        evictActivePlansCache();
        log.info("Deleted subscription plan: id={}", id);
    }

    @Override
    @Transactional
    public void togglePlanStatus(UUID id) {
        SubscriptionPlan plan = getPlanOrThrow(id);
        plan.setIsActive(!plan.getIsActive());
        planRepository.save(plan);
        evictActivePlansCache();
        log.info("Toggled plan status: id={} -> isActive={}", id, plan.getIsActive());
    }

    // ──────────────────────────────────────────────────────────
    // READ
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SubscriptionPlanResponse getPlanById(UUID id) {
        return planMapper.toResponse(getPlanOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getAllActivePlans() {
        Object cached = redisTemplate.opsForValue().get(ACTIVE_PLAN_CACHE_KEY);
        if (cached instanceof List<?> cachedList) {
            try {
                @SuppressWarnings("unchecked")
                List<SubscriptionPlanResponse> casted = (List<SubscriptionPlanResponse>) cachedList;
                return casted;
            } catch (ClassCastException ignored) {
                redisTemplate.delete(ACTIVE_PLAN_CACHE_KEY);
            }
        }

        List<SubscriptionPlanResponse> fresh = planRepository.findAllByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(planMapper::toResponse)
                .collect(Collectors.toList());
        redisTemplate.opsForValue().set(ACTIVE_PLAN_CACHE_KEY, fresh, PAYMENT_CACHE_TTL);
        return fresh;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SubscriptionPlanResponse> getAllPlans(Pageable pageable) {
        return planRepository.findAll(pageable).map(planMapper::toResponse);
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────

    private SubscriptionPlan getPlanOrThrow(UUID id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));
    }

    private void broadcastFreePlan(SubscriptionPlan plan) {
        try {
            FreePlanResponseEvent evt = FreePlanResponseEvent.builder()
                    .planName(plan.getSubsName())
                    .features(plan.getFeatures())
                    .build();
            outboxEventRepository.save(OutboxEvent.builder()
                    .aggregateType("SubscriptionPlan")
                    .aggregateId(plan.getId().toString())
                    .eventType(OutboxEventTypes.FREE_PLAN_BROADCAST)
                    .exchange(RabbitMQConfig.CONFIG_EXCHANGE)
                    .routingKey(RabbitMQConfig.ROUTING_FREE_PLAN_RESPONSE)
                    .payload(objectMapper.writeValueAsString(evt))
                    .published(false)
                    .createdAt(Instant.now())
                    .build());
            log.info("Enqueued FREE plan config outbox for identity-service");
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize FreePlanResponseEvent for outbox", e);
        }
    }

    private void evictActivePlansCache() {
        redisTemplate.delete(ACTIVE_PLAN_CACHE_KEY);
    }
}
