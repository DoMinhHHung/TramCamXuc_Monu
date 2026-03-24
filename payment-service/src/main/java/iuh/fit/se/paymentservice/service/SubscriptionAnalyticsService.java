package iuh.fit.se.paymentservice.service;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface SubscriptionAnalyticsService {
    List<Map<String, Object>> getRevenueStats(LocalDate from, LocalDate to);
    List<Map<String, Object>> getActivePerPlan();
}
