package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.AlbumFavorite;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumFavoriteRepository extends JpaRepository<AlbumFavorite, UUID> {

    boolean existsByUserIdAndAlbumId(UUID userId, UUID albumId);

    Optional<AlbumFavorite> findByUserIdAndAlbumId(UUID userId, UUID albumId);

    long countByAlbumId(UUID albumId);

    void deleteByUserIdAndAlbumId(UUID userId, UUID albumId);

    @Query(value = """
            SELECT album_id, COUNT(*) AS cnt FROM album_favorites
            WHERE created_at >= :since
            GROUP BY album_id
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> topAlbumIdsByFavoriteSinceRaw(@Param("since") LocalDateTime since, Pageable pageable);
}
