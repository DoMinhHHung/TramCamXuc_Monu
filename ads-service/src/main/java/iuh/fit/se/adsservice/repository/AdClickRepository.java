package iuh.fit.se.adsservice.repository;

import iuh.fit.se.adsservice.entity.AdClick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AdClickRepository extends JpaRepository<AdClick, UUID> {

    long countByAdId(UUID adId);

    long countByAdIdAndClickedAtBetween(UUID adId, LocalDateTime from, LocalDateTime to);

    /** Anti-spam: đếm số click của 1 user trong 1 phút gần nhất */
    long countByAdIdAndUserIdAndClickedAtAfter(UUID adId, UUID userId, LocalDateTime after);
}
