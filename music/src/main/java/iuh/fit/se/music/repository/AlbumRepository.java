package iuh.fit.se.music.repository;

import iuh.fit.se.music.entity.Album;
import iuh.fit.se.music.enums.AlbumApprovalStatus;
import iuh.fit.se.music.enums.AlbumVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumRepository extends JpaRepository<Album, UUID> {

    @Query("""
        SELECT DISTINCT a FROM Album a
        JOIN FETCH a.ownerArtist oa
        LEFT JOIN FETCH a.albumSongs als
        LEFT JOIN FETCH als.song s
        LEFT JOIN FETCH s.primaryArtist
        LEFT JOIN FETCH s.genres
        WHERE a.id = :id
        AND a.visibility = 'PUBLIC'
        AND a.approvalStatus = 'APPROVED'
        """)
    Optional<Album> findPublicById(@Param("id") UUID id);

    @Query("""
        SELECT DISTINCT a FROM Album a
        JOIN FETCH a.ownerArtist oa
        LEFT JOIN FETCH a.albumSongs als
        LEFT JOIN FETCH als.song s
        LEFT JOIN FETCH s.primaryArtist
        LEFT JOIN FETCH s.genres
        WHERE a.id = :albumId AND oa.userId = :userId
        """)
    Optional<Album> findByIdAndOwnerUserId(
            @Param("albumId") UUID albumId,
            @Param("userId") UUID userId);

    @Query("""
        SELECT DISTINCT a FROM Album a
        JOIN FETCH a.ownerArtist oa
        LEFT JOIN FETCH a.albumSongs als
        LEFT JOIN FETCH als.song s
        LEFT JOIN FETCH s.primaryArtist
        LEFT JOIN FETCH s.genres
        WHERE a.id = :id
        """)
    Optional<Album> findByIdForAdmin(@Param("id") UUID id);

    @Query("SELECT a FROM Album a JOIN FETCH a.ownerArtist oa WHERE oa.userId = :userId")
    Page<Album> findByOwnerUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
        SELECT a FROM Album a JOIN FETCH a.ownerArtist oa
        WHERE oa.id = :artistId
        AND a.visibility = 'PUBLIC' AND a.approvalStatus = 'APPROVED'
        """)
    Page<Album> findPublicByArtistId(@Param("artistId") UUID artistId, Pageable pageable);

    @Query("""
        SELECT a FROM Album a JOIN FETCH a.ownerArtist oa
        WHERE (:approvalStatus IS NULL OR a.approvalStatus = :approvalStatus)
        AND (:keyword IS NULL
            OR LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(oa.stageName) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<Album> findForAdminQueue(
            @Param("approvalStatus") AlbumApprovalStatus approvalStatus,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("""
        SELECT DISTINCT a FROM Album a
        JOIN FETCH a.ownerArtist
        LEFT JOIN FETCH a.albumSongs als
        LEFT JOIN FETCH als.song
        WHERE a.approvalStatus = 'APPROVED'
        AND a.visibility = 'PRIVATE'
        AND a.scheduledPublishAt IS NOT NULL
        AND a.scheduledPublishAt <= :now
        """)
    List<Album> findAlbumsReadyToPublish(@Param("now") ZonedDateTime now);
}