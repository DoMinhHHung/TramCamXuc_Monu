package iuh.fit.se.music.repository;

import iuh.fit.se.music.entity.Playlist;
import iuh.fit.se.music.enums.PlaylistVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {

    @Query("""
            SELECT p FROM Playlist p
            WHERE p.slug = :slug
            AND (
                p.visibility IN ('PUBLIC', 'COLLABORATIVE')
                OR p.ownerId = :requesterId
            )
            """)
    Optional<Playlist> findBySlugForUser(@Param("slug") String slug,
                                         @Param("requesterId") UUID requesterId);

    @Query("""
            SELECT p FROM Playlist p
            WHERE p.slug = :slug
            AND p.visibility IN ('PUBLIC', 'COLLABORATIVE')
            """)
    Optional<Playlist> findPublicBySlug(@Param("slug") String slug);

    Page<Playlist> findByOwnerId(UUID ownerId, Pageable pageable);

    Optional<Playlist> findByIdAndOwnerId(UUID id, UUID ownerId);

    long countByOwnerId(UUID ownerId);

    @Modifying
    @Query("UPDATE Playlist p SET p.headSongId = :headId WHERE p.id = :playlistId")
    void updateHead(@Param("playlistId") UUID playlistId,
                    @Param("headId") UUID headId);
}