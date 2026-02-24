package iuh.fit.se.music.repository;

import iuh.fit.se.music.entity.AlbumSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlbumSongRepository extends JpaRepository<AlbumSong, UUID> {

    boolean existsByAlbumIdAndSongId(UUID albumId, UUID songId);

    Optional<AlbumSong> findByAlbumIdAndSongId(UUID albumId, UUID songId);

    @Query("SELECT COALESCE(MAX(als.orderIndex), 0) FROM AlbumSong als WHERE als.album.id = :albumId")
    int findMaxOrderIndex(@Param("albumId") UUID albumId);

    @Query("SELECT als FROM AlbumSong als WHERE als.album.id = :albumId ORDER BY als.orderIndex ASC")
    List<AlbumSong> findByAlbumIdOrdered(@Param("albumId") UUID albumId);

    @Modifying
    @Query("""
        UPDATE AlbumSong als SET als.orderIndex = als.orderIndex - 1
        WHERE als.album.id = :albumId AND als.orderIndex > :removedOrder
        """)
    void decrementOrderAfter(
            @Param("albumId") UUID albumId,
            @Param("removedOrder") int removedOrder);

    @Query("SELECT COUNT(als) > 0 FROM AlbumSong als WHERE als.song.id = :songId")
    boolean existsBySongId(@Param("songId") UUID songId);
}