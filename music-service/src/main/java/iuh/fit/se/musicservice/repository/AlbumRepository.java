package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.enums.AlbumStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumRepository extends JpaRepository<Album, UUID> {

    // ── Owner queries ──────────────────────────────────────────────────────────

    Optional<Album> findByIdAndOwnerArtistId(UUID id, UUID ownerArtistId);

    Page<Album> findByOwnerArtistId(UUID ownerArtistId, Pageable pageable);

    // ── Public queries ─────────────────────────────────────────────────────────

    Optional<Album> findByIdAndStatus(UUID id, AlbumStatus status);

    Page<Album> findByOwnerArtistIdAndStatus(UUID ownerArtistId, AlbumStatus status, Pageable pageable);

    // ── Scheduled publish ──────────────────────────────────────────────────────

    @Query("""
            SELECT a FROM Album a
            WHERE a.status = :status
            AND a.scheduledPublishAt IS NOT NULL
            AND a.scheduledPublishAt <= :now
            """)
    List<Album> findAlbumsReadyToPublish(
            @Param("now") ZonedDateTime now,
            @Param("status") AlbumStatus status);

    @Query("""
            SELECT a FROM Album a
            WHERE a.status = :status
            AND a.scheduledPublishAt IS NOT NULL
            AND a.scheduledPublishAt > :now
            """)
    List<Album> findScheduledPublishInFuture(
            @Param("now") ZonedDateTime now,
            @Param("status") AlbumStatus status);

    @Query("""
            SELECT a FROM Album a
            WHERE a.status = :status
            AND a.scheduledPublishAt IS NOT NULL
            AND a.scheduledPublishAt > :from
            AND a.scheduledPublishAt <= :to
            """)
    List<Album> findScheduledBetween(
            @Param("from") ZonedDateTime from,
            @Param("to") ZonedDateTime to,
            @Param("status") AlbumStatus status);

    @Query("""
            SELECT a FROM Album a
            WHERE a.status = :status
            AND a.publishedAt IS NOT NULL
            AND a.publishedAt >= :since
            """)
    Page<Album> findPublicPublishedSince(
            @Param("since") ZonedDateTime since,
            @Param("status") AlbumStatus status,
            Pageable pageable);

    // ── Head pointer update ────────────────────────────────────────────────────

    @Modifying
    @Query("UPDATE Album a SET a.headSongId = :headId WHERE a.id = :albumId")
    void updateHead(@Param("albumId") UUID albumId, @Param("headId") UUID headId);

    // ── Duration update ────────────────────────────────────────────────────────

    @Modifying
    @Query("UPDATE Album a SET a.totalDurationSeconds = a.totalDurationSeconds + :delta WHERE a.id = :albumId")
    void addDuration(@Param("albumId") UUID albumId, @Param("delta") int delta);

    Page<Album> findByStatus(AlbumStatus status, Pageable pageable);
}
