package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.AlbumSong;
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

    List<AlbumSong> findByAlbumId(UUID albumId);

    void deleteByAlbumIdAndSongId(UUID albumId, UUID songId);

    int countByAlbumId(UUID albumId);

    /** Lấy node cuối cùng (nextId = null) */
    Optional<AlbumSong> findByAlbumIdAndNextIdIsNull(UUID albumId);

    /** Cập nhật prevId của một node */
    @Modifying
    @Query("UPDATE AlbumSong s SET s.prevId = :prevId WHERE s.id = :id")
    void updatePrevId(@Param("id") UUID id, @Param("prevId") UUID prevId);

    /** Cập nhật nextId của một node */
    @Modifying
    @Query("UPDATE AlbumSong s SET s.nextId = :nextId WHERE s.id = :id")
    void updateNextId(@Param("id") UUID id, @Param("nextId") UUID nextId);

    /** Duyệt linked list theo thứ tự: trả về tất cả nodes của album (không đảm bảo thứ tự) */
    @Query("SELECT s FROM AlbumSong s WHERE s.albumId = :albumId")
    List<AlbumSong> findAllByAlbumId(@Param("albumId") UUID albumId);

    List<AlbumSong> findBySongId(UUID songId);
}
