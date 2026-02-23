package iuh.fit.se.music.repository;

import iuh.fit.se.music.entity.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, UUID> {

    @Query("""
            SELECT ps FROM PlaylistSong ps
            JOIN FETCH ps.song s
            JOIN FETCH s.primaryArtist
            WHERE ps.playlist.id = :playlistId
            """)
    List<PlaylistSong> findAllByPlaylistId(@Param("playlistId") UUID playlistId);

    boolean existsByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    Optional<PlaylistSong> findByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    void deleteByPlaylistIdAndSongId(UUID playlistId, UUID songId);

    long countByPlaylistId(UUID playlistId);

    @Query("""
            SELECT ps FROM PlaylistSong ps
            WHERE ps.playlist.id = :playlistId
            AND ps.nextId IS NULL
            """)
    Optional<PlaylistSong> findTail(@Param("playlistId") UUID playlistId);
}