package iuh.fit.se.adsservice.repository;

import iuh.fit.se.adsservice.entity.AdImpression;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AdImpressionRepository extends JpaRepository<AdImpression, UUID> {

    long countByAdId(UUID adId);

    long countByAdIdAndPlayedAtBetween(UUID adId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT COUNT(i) FROM AdImpression i WHERE i.adId = :adId AND i.completed = true")
    long countCompletedByAdId(@Param("adId") UUID adId);
}
