package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, UUID> {

    /**
     * Find all playlist-song relations for a specific song
     */
    List<PlaylistSong> findBySongId(UUID songId);

    /**
     * Find all playlist-song relations for a specific playlist
     */
    List<PlaylistSong> findByPlaylistId(UUID playlistId);

    /**
     * Delete all playlist-song relations for a specific song.
     * Used when soft-deleting a song to remove it from all playlists.
     */
    @Modifying
    @Query("DELETE FROM PlaylistSong ps WHERE ps.song.id = :songId")
    void deleteBySongId(@Param("songId") UUID songId);

    /**
     * Find playlist-song by playlist and song
     */
    Optional<PlaylistSong> findByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    /**
     * Check if a song exists in a playlist
     */
    boolean existsByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    /**
     * Find previous and next playlist songs for linked list operations
     */
    Optional<PlaylistSong> findByNextId(UUID nextId);
    Optional<PlaylistSong> findByPrevId(UUID prevId);
}
