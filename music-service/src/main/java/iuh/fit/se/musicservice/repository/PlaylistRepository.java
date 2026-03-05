package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Playlist;
import iuh.fit.se.musicservice.enums.PlaylistVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {

    /**
     * Find all playlists by owner ID
     */
    Page<Playlist> findByOwnerId(String ownerId, Pageable pageable);

    /**
     * Find all public playlists by owner ID
     */
    Page<Playlist> findByOwnerIdAndVisibility(String ownerId, PlaylistVisibility visibility, Pageable pageable);

    /**
     * Count playlists by owner ID (for limit checking)
     */
    long countByOwnerId(String ownerId);

    /**
     * Find playlist by slug
     */
    Optional<Playlist> findBySlug(String slug);

    /**
     * Check if slug exists
     */
    boolean existsBySlug(String slug);

    /**
     * Search public playlists by name
     */
    @Query("SELECT p FROM Playlist p WHERE p.visibility = 'PUBLIC' AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Playlist> searchPublicByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
