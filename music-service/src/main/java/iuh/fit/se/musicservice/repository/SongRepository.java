package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongRepository extends JpaRepository<Song, UUID> {

    // ── Public queries (chỉ lấy bài chưa bị xóa, đã public và transcode xong) ──

    @Query("""
            SELECT s FROM Song s
            LEFT JOIN FETCH s.genres
            WHERE s.id = :id
            AND s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            """)
    Optional<Song> findPublicById(@Param("id") UUID id);

        @Query(value = """
                        SELECT DISTINCT s FROM Song s
                        LEFT JOIN s.genres g
                        WHERE s.status = 'PUBLIC'
                        AND s.transcodeStatus = 'COMPLETED'
                        AND s.deletedAt IS NULL
                        AND (:keywordPattern IS NULL
                                OR s.title ILIKE :keywordPattern
                                OR s.primaryArtistStageName ILIKE :keywordPattern)
                        AND (:genreId IS NULL OR g.id = :genreId)
                        AND (:artistId IS NULL OR s.primaryArtistId = :artistId)
                        """,
                        countQuery = """
                        SELECT COUNT(DISTINCT s.id) FROM Song s
                        LEFT JOIN s.genres g
                        WHERE s.status = 'PUBLIC'
                        AND s.transcodeStatus = 'COMPLETED'
                        AND s.deletedAt IS NULL
                        AND (:keywordPattern IS NULL
                                OR s.title ILIKE :keywordPattern
                                OR s.primaryArtistStageName ILIKE :keywordPattern)
                        AND (:genreId IS NULL OR g.id = :genreId)
                        AND (:artistId IS NULL OR s.primaryArtistId = :artistId)
                        """)
    Page<Song> searchPublic(
            @Param("keywordPattern") String keywordPattern,
            @Param("genreId") UUID genreId,
            @Param("artistId") UUID artistId,
            Pageable pageable
    );

    @Query("""
            SELECT DISTINCT s FROM Song s
            LEFT JOIN s.genres
            WHERE s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            ORDER BY s.playCount DESC
            """)
    Page<Song> findTrending(Pageable pageable);

    @Query("""
            SELECT DISTINCT s FROM Song s
            LEFT JOIN s.genres
            WHERE s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            ORDER BY s.createdAt DESC
            """)
    Page<Song> findNewest(Pageable pageable);

    @Query("""
            SELECT s FROM Song s
            LEFT JOIN s.genres
            WHERE s.primaryArtistId = :artistId
            AND s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            """)
    Page<Song> findPublicByArtistId(@Param("artistId") UUID artistId, Pageable pageable);

    // ── Artist queries (owner) ─────────────────────────────────────────────────

    @Query("""
            SELECT s FROM Song s
            LEFT JOIN FETCH s.genres
            WHERE s.id = :id
            AND s.ownerUserId = :userId
            AND s.deletedAt IS NULL
            """)
    Optional<Song> findByIdAndOwnerUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query(value = """
            SELECT DISTINCT s FROM Song s
            LEFT JOIN s.genres g
            WHERE s.ownerUserId = :userId
              AND s.deletedAt IS NULL
            ORDER BY s.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(s) FROM Song s
            WHERE s.ownerUserId = :userId
              AND s.deletedAt IS NULL
            """)
    Page<Song> findAllByOwnerUserId(@Param("userId") UUID userId, Pageable pageable);

    // ── Admin queries ──────────────────────────────────────────────────────────

    @Query("""
            SELECT s FROM Song s
            LEFT JOIN FETCH s.genres
            WHERE s.id = :id
            """)
    Optional<Song> findByIdForAdmin(@Param("id") UUID id);

    @Query("""
            SELECT s FROM Song s
            WHERE (:keywordPattern IS NULL
                OR s.title ILIKE :keywordPattern
                OR s.primaryArtistStageName ILIKE :keywordPattern)
            AND (:status IS NULL OR s.status = :status)
            AND (:showDeleted = true OR s.deletedAt IS NULL)
            """)
    Page<Song> findForAdmin(
            @Param("keywordPattern") String keywordPattern,
            @Param("status") SongStatus status,
            @Param("showDeleted") boolean showDeleted,
            Pageable pageable
    );

    // ── Play count ─────────────────────────────────────────────────────────────

    @Modifying
    @Query("UPDATE Song s SET s.playCount = s.playCount + :delta WHERE s.id = :id")
    void incrementPlayCount(@Param("id") UUID id, @Param("delta") long delta);

    // ── Transcode callback ─────────────────────────────────────────────────────

    boolean existsById(UUID id);

    @Query("SELECT s.jamendoId FROM Song s WHERE s.jamendoId IN :ids")
    List<String> findExistingJamendoIds(@Param("ids") List<String> ids);

    /**
     * Worker idempotency guard — fast exists check before expensive I/O.
     */
    boolean existsByJamendoId(String jamendoId);

    @Query("""
            SELECT s FROM Song s
            LEFT JOIN FETCH s.genres
            WHERE s.id IN :ids
            AND s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            """)
    List<Song> findPublicByIdIn(@Param("ids") List<UUID> ids);

    @Query("""
            SELECT s FROM Song s
            WHERE s.primaryArtistId = :artistId
            AND s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            ORDER BY s.playCount DESC
            """)
    List<Song> findTopByArtistId(@Param("artistId") UUID artistId, Pageable pageable);

    @Query("""
        SELECT s FROM Song s
        LEFT JOIN FETCH s.genres
        WHERE s.id = :id
        AND s.deletedAt IS NULL
        """)
    Optional<Song> findByIdWithGenres(@Param("id") UUID id);
}
