package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, UUID> {

    @Modifying
    @Query("delete from PlaylistSong ps where ps.song.id = :songId")
    void deleteAllBySongId(@Param("songId") UUID songId);
}
