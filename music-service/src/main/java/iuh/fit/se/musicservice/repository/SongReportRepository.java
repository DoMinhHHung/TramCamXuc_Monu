package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.SongReport;
import iuh.fit.se.musicservice.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SongReportRepository extends JpaRepository<SongReport, UUID> {

    boolean existsBySongIdAndReporterIdAndStatus(UUID songId, UUID reporterId, ReportStatus status);

    Page<SongReport> findBySongId(UUID songId, Pageable pageable);

    @Query("""
            SELECT r FROM SongReport r
            WHERE (:status IS NULL OR r.status = :status)
            AND (:songId IS NULL OR r.songId = :songId)
            ORDER BY r.createdAt DESC
            """)
    Page<SongReport> findForAdmin(
            @Param("status") ReportStatus status,
            @Param("songId") UUID songId,
            Pageable pageable
    );

    long countBySongIdAndStatus(UUID songId, ReportStatus status);
}