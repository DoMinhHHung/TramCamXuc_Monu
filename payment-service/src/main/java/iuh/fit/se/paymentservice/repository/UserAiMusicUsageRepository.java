package iuh.fit.se.paymentservice.repository;

import iuh.fit.se.paymentservice.entity.UserAiMusicUsage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserAiMusicUsageRepository extends JpaRepository<UserAiMusicUsage, UUID> {

    Optional<UserAiMusicUsage> findByUserIdAndPeriodYm(UUID userId, String periodYm);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM UserAiMusicUsage u WHERE u.userId = :userId AND u.periodYm = :periodYm")
    Optional<UserAiMusicUsage> findByUserIdAndPeriodYmForUpdate(
            @Param("userId") UUID userId,
            @Param("periodYm") String periodYm);
}
