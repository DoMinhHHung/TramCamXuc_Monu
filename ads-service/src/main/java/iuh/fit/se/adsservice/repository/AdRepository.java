package iuh.fit.se.adsservice.repository;

import iuh.fit.se.adsservice.entity.Ad;
import iuh.fit.se.adsservice.enums.AdStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AdRepository extends JpaRepository<Ad, UUID> {

    /** Tất cả ads đang ACTIVE và còn trong schedule — dùng để random chọn ad */
    @Query("""
        SELECT a FROM Ad a
        WHERE a.status = 'ACTIVE'
          AND (a.startDate IS NULL OR a.startDate <= :today)
          AND (a.endDate   IS NULL OR a.endDate   >= :today)
        """)
    List<Ad> findAllEligible(@Param("today") LocalDate today);

    Page<Ad> findByStatus(AdStatus status, Pageable pageable);

    Page<Ad> findByAdvertiserNameContainingIgnoreCase(String advertiserName, Pageable pageable);

    /** Filter kết hợp status + advertiserName */
    Page<Ad> findByStatusAndAdvertiserNameContainingIgnoreCase(
            AdStatus status, String advertiserName, Pageable pageable);

    /** Tăng impression count atomic */
    @Modifying
    @Query("UPDATE Ad a SET a.totalImpressions = a.totalImpressions + 1 WHERE a.id = :id")
    void incrementImpressions(@Param("id") UUID id);

    /** Tăng click count atomic */
    @Modifying
    @Query("UPDATE Ad a SET a.totalClicks = a.totalClicks + 1 WHERE a.id = :id")
    void incrementClicks(@Param("id") UUID id);

    /** Auto-pause ads vượt budget */
    @Query("""
        SELECT a FROM Ad a
        WHERE a.status = 'ACTIVE'
          AND a.budgetVnd > 0
          AND (a.cpmVnd * a.totalImpressions / 1000) >= a.budgetVnd
        """)
    List<Ad> findBudgetExceededAds();

    /** Danh sách tên advertiser duy nhất */
    @Query("SELECT DISTINCT a.advertiserName FROM Ad a ORDER BY a.advertiserName")
    List<String> findDistinctAdvertiserNames();
}
