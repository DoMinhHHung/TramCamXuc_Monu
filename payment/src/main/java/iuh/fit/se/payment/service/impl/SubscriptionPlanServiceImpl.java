package iuh.fit.se.payment.service.impl;

import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.event.FreePlanResponseEvent;
import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.payment.dto.mapper.SubscriptionPlanMapper;
import iuh.fit.se.payment.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.payment.entity.SubscriptionPlan;
import iuh.fit.se.payment.repository.SubscriptionPlanRepository;
import iuh.fit.se.payment.repository.UserSubscriptionRepository;
import iuh.fit.se.payment.service.SubscriptionPlanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionPlanServiceImpl implements SubscriptionPlanService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPlanMapper planMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public SubscriptionPlanResponse createPlan(SubscriptionPlanRequest request) {
        if (planRepository.existsBySubsName(request.getSubsName())) {
            throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS);
        }

        SubscriptionPlan plan = planMapper.toEntity(request);
        if (plan.getIsActive() == null) {
            plan.setIsActive(true);
        }
        if (plan.getDisplayOrder() == null) {
            plan.setDisplayOrder(0);
        }

        plan = planRepository.save(plan);
        log.info("Created subscription plan: {}", plan.getId());

        return planMapper.toResponse(plan);
    }

    @Override
    @Transactional
    public SubscriptionPlanResponse updatePlan(UUID id, SubscriptionPlanRequest request) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));

        if (!plan.getSubsName().equals(request.getSubsName()) &&
                planRepository.existsBySubsName(request.getSubsName())) {
            throw new AppException(ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS);
        }

        planMapper.updateEntity(request, plan);
        plan = planRepository.save(plan);

        if (SubscriptionConstants.PLAN_FREE.equals(plan.getSubsName())) {
            log.info("Broadcasting update for FREE plan configuration...");
            eventPublisher.publishEvent(FreePlanResponseEvent.builder()
                    .planName(plan.getSubsName())
                    .features(plan.getFeatures())
                    .build());
        }

        log.info("Updated subscription plan: {}", plan.getId());
        return planMapper.toResponse(plan);
    }

    @Override
    @Transactional
    public void deletePlan(UUID id) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));

        Long activeCount = userSubscriptionRepository.countActiveSubscriptionsByPlan(id);
        if (activeCount > 0) {
            throw new AppException(ErrorCode.CANNOT_DELETE_PLAN_WITH_ACTIVE_SUBSCRIPTIONS);
        }

        planRepository.delete(plan);
        log.info("Deleted subscription plan: {}", id);
    }

    @Override
    public SubscriptionPlanResponse getPlanById(UUID id) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));
        return planMapper.toResponse(plan);
    }

    @Override
    public List<SubscriptionPlanResponse> getAllActivePlans() {
        return planRepository.findAllByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(planMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Page<SubscriptionPlanResponse> getAllPlans(Pageable pageable) {
        return planRepository.findAll(pageable)
                .map(planMapper::toResponse);
    }

    @Override
    @Transactional
    public void togglePlanStatus(UUID id) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND));

        plan.setIsActive(!plan.getIsActive());
        planRepository.save(plan);

        log.info("Toggled plan status: {} -> {}", id, plan.getIsActive());
    }
}