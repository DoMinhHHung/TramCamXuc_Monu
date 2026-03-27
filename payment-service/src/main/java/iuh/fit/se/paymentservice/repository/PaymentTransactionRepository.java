package iuh.fit.se.paymentservice.repository;

import iuh.fit.se.paymentservice.entity.PaymentTransaction;
import iuh.fit.se.paymentservice.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByOrderCode(Long orderCode);

    /**
     * Idempotent webhook: chỉ một luồng chuyển PENDING → COMPLETED (tránh race khi PayOS gửi trùng).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE PaymentTransaction t
            SET t.status = :newStatus, t.providerTransactionId = :providerId
            WHERE t.orderCode = :orderCode AND t.status = :pending
            """)
    int updateFromPendingToCompleted(
            @Param("orderCode") Long orderCode,
            @Param("newStatus") PaymentStatus newStatus,
            @Param("providerId") String providerId,
            @Param("pending") PaymentStatus pending);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE PaymentTransaction t
            SET t.status = :failedStatus
            WHERE t.orderCode = :orderCode AND t.status = :pending
            """)
    int updateFromPendingToFailed(
            @Param("orderCode") Long orderCode,
            @Param("failedStatus") PaymentStatus failedStatus,
            @Param("pending") PaymentStatus pending);

    Optional<PaymentTransaction> findByReferenceCode(String referenceCode);

    Page<PaymentTransaction> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<PaymentTransaction> findAllByStatus(PaymentStatus status, Pageable pageable);

    @Query("""
            SELECT FUNCTION('DATE', pt.createdAt), COALESCE(SUM(pt.amount), 0)
            FROM PaymentTransaction pt
            WHERE pt.status = :status
              AND pt.createdAt >= :from
              AND pt.createdAt < :toExclusive
            GROUP BY FUNCTION('DATE', pt.createdAt)
            """)
    List<Object[]> sumAmountByDateAndStatus(@Param("status") PaymentStatus status,
                                            @Param("from") LocalDateTime from,
                                            @Param("toExclusive") LocalDateTime toExclusive);
}
