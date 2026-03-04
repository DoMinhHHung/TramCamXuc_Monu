package iuh.fit.se.paymentservice.repository;

import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {

    Optional<UserSubscription> findByUserIdAndStatus(UUID userId, SubscriptionStatus status);

    List<UserSubscription> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT us FROM UserSubscription us WHERE us.expiresAt < :now AND us.status = 'ACTIVE'")
    List<UserSubscription> findExpiredSubscriptions(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(us) FROM UserSubscription us WHERE us.plan.id = :planId AND us.status = 'ACTIVE'")
    Long countActiveSubscriptionsByPlan(@Param("planId") UUID planId);
}
