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

    /** Kiểm tra user đã report bài hát này chưa */
    boolean existsBySongIdAndReporterId(UUID songId, UUID reporterId);

    /** Danh sách report của một bài hát */
    Page<SongReport> findBySongId(UUID songId, Pageable pageable);

    /** Danh sách report theo status (cho admin) */
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

    /** Số lượng report PENDING của một bài hát */
    long countBySongIdAndStatus(UUID songId, ReportStatus status);

        /** Danh sách report của một user */
        Page<SongReport> findByReporterIdOrderByCreatedAtDesc(UUID reporterId, Pageable pageable);

        /** Tìm report theo id + reporter để đảm bảo user chỉ thao tác report của chính mình */
        java.util.Optional<SongReport> findByIdAndReporterId(UUID id, UUID reporterId);
}
