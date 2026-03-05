package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.AlbumSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlbumSongRepository extends JpaRepository<AlbumSong, UUID> {

    /**
     * Find all album-song relations for a specific song
     */
    List<AlbumSong> findBySongId(UUID songId);

    /**
     * Find all album-song relations for a specific album
     */
    List<AlbumSong> findByAlbumIdOrderByOrderIndex(UUID albumId);

    /**
     * Delete all album-song relations for a specific song.
     * Used when soft-deleting a song to remove it from all albums.
     */
    @Modifying
    @Query("DELETE FROM AlbumSong as_ WHERE as_.song.id = :songId")
    void deleteBySongId(@Param("songId") UUID songId);

    /**
     * Check if a song exists in an album
     */
    boolean existsByAlbumIdAndSongId(UUID albumId, UUID songId);
}
