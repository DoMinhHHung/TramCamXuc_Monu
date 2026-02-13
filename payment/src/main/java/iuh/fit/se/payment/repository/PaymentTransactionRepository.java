package iuh.fit.se.payment.repository;

import iuh.fit.se.payment.entity.PaymentTransaction;
import iuh.fit.se.payment.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByReferenceCode(String referenceCode);

    Optional<PaymentTransaction> findByOrderCode(Long orderCode);

    Page<PaymentTransaction> findAllByUserId(UUID userId, Pageable pageable);

    Page<PaymentTransaction> findAllByStatus(PaymentStatus status, Pageable pageable);
}