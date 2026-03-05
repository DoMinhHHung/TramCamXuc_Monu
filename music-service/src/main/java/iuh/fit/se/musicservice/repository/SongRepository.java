package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongRepository extends JpaRepository<Song, UUID> {

    /**
     * Find a song by ID that is not deleted
     */
    @Query("SELECT s FROM Song s WHERE s.id = :id AND s.status <> 'DELETED'")
    Optional<Song> findActiveById(@Param("id") UUID id);

    /**
     * Find all active songs by artist ID
     */
    @Query("SELECT s FROM Song s WHERE s.artistId = :artistId AND s.status = 'ACTIVE'")
    Page<Song> findActiveByArtistId(@Param("artistId") String artistId, Pageable pageable);

    /**
     * Find all songs by artist ID (including non-active for artist's own view)
     */
    @Query("SELECT s FROM Song s WHERE s.artistId = :artistId AND s.status <> 'DELETED'")
    Page<Song> findByArtistId(@Param("artistId") String artistId, Pageable pageable);

    /**
     * Search songs by keyword in title
     */
    @Query("SELECT s FROM Song s WHERE s.status = 'ACTIVE' AND " +
           "(LOWER(s.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Song> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Get trending songs (ordered by play count)
     */
    @Query("SELECT s FROM Song s WHERE s.status = 'ACTIVE' ORDER BY s.playCount DESC")
    Page<Song> findTrending(Pageable pageable);

    /**
     * Get newest songs
     */
    @Query("SELECT s FROM Song s WHERE s.status = 'ACTIVE' ORDER BY s.createdAt DESC")
    Page<Song> findNewest(Pageable pageable);

    /**
     * Find song by slug
     */
    Optional<Song> findBySlug(String slug);

    /**
     * Check if slug exists
     */
    boolean existsBySlug(String slug);
}
