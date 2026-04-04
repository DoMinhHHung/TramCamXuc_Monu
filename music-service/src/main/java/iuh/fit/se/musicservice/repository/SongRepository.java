package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.entity.SongReport;
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
            SELECT DISTINCT s.* FROM songs s
            LEFT JOIN song_genres sg ON s.id = sg.song_id
            WHERE s.status = 'PUBLIC'
              AND s.transcode_status = 'COMPLETED'
              AND s.deleted_at IS NULL
              AND (:keyword IS NULL 
                   OR s.title ILIKE '%' || :keyword || '%'
                   OR s.primary_artist_stage_name ILIKE '%' || :keyword || '%')
              AND (:genreId IS NULL OR sg.genre_id = :genreId)
              AND (:artistId IS NULL OR s.primary_artist_id = :artistId)
                                        AND (:viewerId IS NULL OR NOT EXISTS (
                                                                SELECT 1 FROM song_reports sr
                                                                WHERE sr.song_id = s.id
                                                                        AND sr.reporter_id = :viewerId
                                        ))
            """,
            countQuery = """
            SELECT COUNT(DISTINCT s.id) FROM songs s
            LEFT JOIN song_genres sg ON s.id = sg.song_id
            WHERE s.status = 'PUBLIC'
              AND s.transcode_status = 'COMPLETED'
              AND s.deleted_at IS NULL
              AND (:keyword IS NULL 
                   OR s.title ILIKE '%' || :keyword || '%'
                   OR s.primary_artist_stage_name ILIKE '%' || :keyword || '%')
              AND (:genreId IS NULL OR sg.genre_id = :genreId)
              AND (:artistId IS NULL OR s.primary_artist_id = :artistId)
                                                        AND (:viewerId IS NULL OR NOT EXISTS (
                                                                                SELECT 1 FROM song_reports sr
                                                                                WHERE sr.song_id = s.id
                                                                                        AND sr.reporter_id = :viewerId
                                                        ))
            """,
            nativeQuery = true)
    Page<Song> searchPublic(@Param("keyword") String keyword,
                            @Param("genreId") UUID genreId,
                            @Param("artistId") UUID artistId,
                                                                                                                @Param("viewerId") UUID viewerId,
                            Pageable pageable);

                @Query("""
                                                SELECT s FROM Song s
                                                LEFT JOIN FETCH s.genres
                                                WHERE s.id = :id
                                                        AND s.status = 'PUBLIC'
                                                        AND s.transcodeStatus = 'COMPLETED'
                                                        AND s.deletedAt IS NULL
                                                        AND (:viewerId IS NULL OR NOT EXISTS (
                                                                                SELECT r.id FROM SongReport r
                                                                                WHERE r.songId = s.id
                                                                                        AND r.reporterId = :viewerId
                                                        ))
                                                """)
                Optional<Song> findPublicByIdVisible(@Param("id") UUID id, @Param("viewerId") UUID viewerId);

    @Query("""
            SELECT s FROM Song s
            WHERE s.status = 'PUBLIC'
              AND s.transcodeStatus = 'COMPLETED'
              AND s.deletedAt IS NULL
                                                        AND (:viewerId IS NULL OR NOT EXISTS (
                                                                                SELECT r.id FROM SongReport r
                                                                                WHERE r.songId = s.id
                                                                                        AND r.reporterId = :viewerId
                                                        ))
            ORDER BY s.playCount DESC
            """)
                Page<Song> findTrendingVisible(@Param("viewerId") UUID viewerId, Pageable pageable);

    @Query("""
            SELECT s FROM Song s
            WHERE s.status = 'PUBLIC'
              AND s.transcodeStatus = 'COMPLETED'
              AND s.deletedAt IS NULL
                                                        AND (:viewerId IS NULL OR NOT EXISTS (
                                                                                SELECT r.id FROM SongReport r
                                                                                WHERE r.songId = s.id
                                                                                        AND r.reporterId = :viewerId
                                                        ))
            ORDER BY s.createdAt DESC
            """)
                Page<Song> findNewestVisible(@Param("viewerId") UUID viewerId, Pageable pageable);

    @Query("""
            SELECT s FROM Song s
            LEFT JOIN s.genres
            WHERE s.primaryArtistId = :artistId
            AND s.status = 'PUBLIC'
            AND s.transcodeStatus = 'COMPLETED'
            AND s.deletedAt IS NULL
            AND (:viewerId IS NULL OR NOT EXISTS (
                  SELECT r.id FROM SongReport r
                  WHERE r.songId = s.id
                    AND r.reporterId = :viewerId
            ))
            """)
    Page<Song> findPublicByArtistIdVisible(@Param("artistId") UUID artistId,
                                           @Param("viewerId") UUID viewerId,
                                           Pageable pageable);

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
            WHERE (:keywordPattern IS NULL OR s.title ILIKE :keywordPattern OR s.primaryArtistStageName ILIKE :keywordPattern)
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
                AND (:viewerId IS NULL OR NOT EXISTS (
                          SELECT r.id FROM SongReport r
                          WHERE r.songId = s.id
                                AND r.reporterId = :viewerId
                ))
            """)
        List<Song> findPublicByIdInVisible(@Param("ids") List<UUID> ids,
                                                                           @Param("viewerId") UUID viewerId);

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

    boolean existsBySoundcloudId(String soundcloudId);

    @Query("SELECT s.soundcloudId FROM Song s WHERE s.soundcloudId IN :ids")
    List<String> findExistingSoundcloudIds(@Param("ids") List<String> ids);

    @Query("""
    SELECT s FROM Song s
    WHERE s.soundcloudId = :soundcloudId
    AND s.deletedAt IS NULL
    """)
    Optional<Song> findBySoundcloudId(@Param("soundcloudId") String soundcloudId);
}
