package iuh.fit.se.paymentservice.repository;

import iuh.fit.se.paymentservice.entity.SubscriptionPlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, UUID> {

    List<SubscriptionPlan> findAllByIsActiveTrueOrderByDisplayOrderAsc();

    Optional<SubscriptionPlan> findBySubsNameAndIsActiveTrue(String subsName);

    boolean existsBySubsName(String subsName);

    Page<SubscriptionPlan> findAll(Pageable pageable);
}
