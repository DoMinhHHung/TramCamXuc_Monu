package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, UUID> {

    /**
     * Song.primaryArtist là denormalized (primaryArtistId/StageName/AvatarUrl)
     * nên KHÔNG JOIN FETCH primaryArtist — chỉ JOIN FETCH song là đủ.
     */
    @Query("""
            SELECT ps FROM PlaylistSong ps
            JOIN FETCH ps.song s
            WHERE ps.playlist.id = :playlistId
            """)
    List<PlaylistSong> findAllByPlaylistId(@Param("playlistId") UUID playlistId);

    boolean existsByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    Optional<PlaylistSong> findByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    void deleteByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    long countByPlaylistId(UUID playlistId);

    /** Tìm TAIL node (nextId = null) — dùng khi append */
    @Query("""
            SELECT ps FROM PlaylistSong ps
            WHERE ps.playlist.id = :playlistId
            AND ps.nextId IS NULL
            """)
    Optional<PlaylistSong> findTail(@Param("playlistId") UUID playlistId);
}
