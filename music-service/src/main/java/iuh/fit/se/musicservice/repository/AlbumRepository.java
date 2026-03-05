package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.enums.AlbumStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumRepository extends JpaRepository<Album, UUID> {

    /**
     * Find album by ID that is not deleted
     */
    @Query("SELECT a FROM Album a WHERE a.id = :id AND a.status <> 'DELETED'")
    Optional<Album> findActiveById(@Param("id") UUID id);

    /**
     * Find all active albums by artist ID
     */
    @Query("SELECT a FROM Album a WHERE a.ownerArtistId = :artistId AND a.status = 'PUBLIC'")
    Page<Album> findPublicByArtistId(@Param("artistId") String artistId, Pageable pageable);

    /**
     * Find all albums by artist ID (including drafts for owner view)
     */
    @Query("SELECT a FROM Album a WHERE a.ownerArtistId = :artistId AND a.status <> 'DELETED'")
    Page<Album> findByArtistId(@Param("artistId") String artistId, Pageable pageable);

    /**
     * Search albums by title
     */
    @Query("SELECT a FROM Album a WHERE a.status = 'PUBLIC' AND " +
           "(LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Album> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Find album by slug
     */
    Optional<Album> findBySlug(String slug);

    /**
     * Check if slug exists
     */
    boolean existsBySlug(String slug);
}
