package iuh.fit.se.paymentservice.service.impl;

import iuh.fit.se.paymentservice.enums.PaymentStatus;
import iuh.fit.se.paymentservice.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.paymentservice.repository.PaymentTransactionRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.service.SubscriptionAnalyticsService;
import iuh.fit.se.paymentservice.service.SubscriptionPlanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SubscriptionAnalyticsServiceImpl implements SubscriptionAnalyticsService {
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPlanService planService;

    @Override
    public List<Map<String, Object>> getRevenueStats(LocalDate from, LocalDate to) {
        Map<LocalDate, BigDecimal> daily = new TreeMap<>();
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = paymentTransactionRepository.sumAmountByDateAndStatus(
                PaymentStatus.COMPLETED, fromTime, toExclusive);

        for (Object[] row : rows) {
            LocalDate date = toLocalDate(row != null && row.length > 0 ? row[0] : null);
            BigDecimal total = toBigDecimal(row != null && row.length > 1 ? row[1] : null);
            if (date == null || total == null) {
                log.warn("Skipping invalid revenue aggregate row. dateType={}, amountType={}, rawDate={}, rawAmount={}",
                        typeOf(row != null && row.length > 0 ? row[0] : null),
                        typeOf(row != null && row.length > 1 ? row[1] : null),
                        row != null && row.length > 0 ? row[0] : null,
                        row != null && row.length > 1 ? row[1] : null);
                continue;
            }
            daily.put(date, total);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            Map<String, Object> m = new HashMap<>();
            m.put("date", d.toString());
            m.put("total", daily.getOrDefault(d, BigDecimal.ZERO));
            result.add(m);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getActivePerPlan() {
        List<SubscriptionPlanResponse> plans = planService.getAllActivePlans();
        Map<UUID, Long> activeCountByPlan = new HashMap<>();
        for (Object[] row : userSubscriptionRepository.countActiveSubscriptionsGroupByPlan()) {
            if (row[0] instanceof UUID planId && row[1] instanceof Number count) {
                activeCountByPlan.put(planId, count.longValue());
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (SubscriptionPlanResponse plan : plans) {
            Long count = activeCountByPlan.getOrDefault(plan.getId(), 0L);
            Map<String, Object> m = new HashMap<>();
            m.put("planId", plan.getId());
            m.put("planName", plan.getSubsName());
            m.put("count", count);
            result.add(m);
        }
        return result;
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate localDate) return localDate;
        if (value instanceof LocalDateTime localDateTime) return localDateTime.toLocalDate();
        if (value instanceof java.sql.Date sqlDate) return sqlDate.toLocalDate();
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toLocalDateTime().toLocalDate();
        if (value instanceof java.util.Date date) {
            return new java.sql.Date(date.getTime()).toLocalDate();
        }
        if (value instanceof CharSequence text) {
            try {
                return LocalDate.parse(text.toString());
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal bigDecimal) return bigDecimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        if (value instanceof CharSequence text) {
            try {
                return new BigDecimal(text.toString());
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private String typeOf(Object value) {
        return value == null ? "null" : value.getClass().getName();
    }
}
